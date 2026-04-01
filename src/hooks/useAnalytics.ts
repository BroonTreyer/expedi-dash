import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemo } from "react";
import { format, subDays, differenceInDays, getDay, getISOWeek } from "date-fns";

export interface AnalyticsFilters {
  dateFrom: string;
  dateTo: string;
  vendedores?: string[];
  tipoCaminhao?: string[];
  ufs?: string[];
}

export interface DailyWeight {
  date: string;
  peso: number;
  carregado: number;
  acumulado: number;
}

export interface VendedorRanking {
  nome: string;
  peso: number;
  pedidos: number;
  participacao: number;
  mediaPorPedido: number;
}

export interface UfDistribution {
  uf: string;
  peso: number;
  pedidos: number;
  participacao: number;
}

export interface RupturaDaily {
  date: string;
  total: number;
  rupturas: number;
  taxa: number;
}

export interface StatusBreakdown {
  status: string;
  count: number;
  peso: number;
}

export interface TipoCaminhaoBreakdown {
  tipo: string;
  peso: number;
  pedidos: number;
}

export interface DailyByTipo {
  date: string;
  [tipo: string]: string | number;
}

export interface ProdutoRuptura {
  produto: string;
  rupturas: number;
}

export interface HeatmapCell {
  week: number;
  dayOfWeek: number;
  date: string;
  taxa: number;
  rupturas: number;
  total: number;
}

export interface KpiComparison {
  totalPeso: number;
  totalPedidos: number;
  totalRupturas: number;
  totalCarregado: number;
  diasUnicos: number;
  mediaDiaria: number;
  taxaRuptura: number;
  // variations vs previous period
  varPeso: number | null;
  varPedidos: number | null;
  varRupturas: number | null;
  varCarregado: number | null;
  varMediaDiaria: number | null;
  varTaxaRuptura: number | null;
}

function calcVar(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : null;
  return Math.round(((current - previous) / previous) * 100);
}

export function useAnalytics(filters: AnalyticsFilters) {
  // Calculate previous period range
  const daysDiff = differenceInDays(new Date(filters.dateTo), new Date(filters.dateFrom));
  const prevTo = format(subDays(new Date(filters.dateFrom), 1), "yyyy-MM-dd");
  const prevFrom = format(subDays(new Date(filters.dateFrom), daysDiff + 1), "yyyy-MM-dd");

  const query = useQuery({
    queryKey: ["analytics-v3", filters.dateFrom, filters.dateTo],
    queryFn: async () => {
      // Fetch current + previous period in parallel
      const [currentRes, prevRes] = await Promise.all([
        supabase
          .from("carregamentos_dia")
          .select("data, peso, status, vendedor_id, ruptura, uf, tipo_caminhao, nome_produto, vendedores(nome_vendedor)")
          .gte("data", filters.dateFrom)
          .lte("data", filters.dateTo)
          .order("data", { ascending: true })
          .limit(5000),
        supabase
          .from("carregamentos_dia")
          .select("data, peso, status, ruptura")
          .gte("data", prevFrom)
          .lte("data", prevTo)
          .limit(5000),
      ]);
      if (currentRes.error) throw currentRes.error;
      if (prevRes.error) throw prevRes.error;
      return { current: currentRes.data as any[], previous: prevRes.data as any[] };
    },
    staleTime: 60_000,
  });

  const analytics = useMemo(() => {
    const raw = query.data?.current ?? [];
    const prevRaw = query.data?.previous ?? [];

    // Apply client-side filters
    const filtered = raw.filter((r) => {
      if (filters.vendedores?.length && !filters.vendedores.includes(r.vendedores?.nome_vendedor || "Sem vendedor")) return false;
      if (filters.tipoCaminhao?.length && !filters.tipoCaminhao.includes(r.tipo_caminhao || "N/I")) return false;
      if (filters.ufs?.length && !filters.ufs.includes(r.uf || "N/I")) return false;
      return true;
    });

    // === Previous period KPIs ===
    const prevPeso = prevRaw.reduce((s, r) => s + (r.peso ?? 0), 0);
    const prevPedidos = prevRaw.length;
    const prevRupturas = prevRaw.filter((r) => r.ruptura).length;
    const prevCarregado = prevRaw.filter((r) => r.status === "Carregado").reduce((s, r) => s + (r.peso ?? 0), 0);
    const prevDias = new Set(prevRaw.map((r) => r.data)).size;
    const prevMedia = prevDias > 0 ? Math.round(prevPeso / prevDias) : 0;
    const prevTaxaRuptura = prevPedidos > 0 ? Math.round((prevRupturas / prevPedidos) * 100) : 0;

    // === 1. Peso diário + acumulado ===
    const dailyMap = new Map<string, { peso: number; carregado: number }>();
    filtered.forEach((r) => {
      const d = r.data;
      const entry = dailyMap.get(d) || { peso: 0, carregado: 0 };
      entry.peso += r.peso ?? 0;
      if (r.status === "Carregado") entry.carregado += r.peso ?? 0;
      dailyMap.set(d, entry);
    });
    let acumulado = 0;
    const dailyWeight: DailyWeight[] = Array.from(dailyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => {
        acumulado += v.peso;
        return { date, ...v, acumulado };
      });

    // === 2. Ranking vendedores ===
    const totalPesoAll = filtered.reduce((s, r) => s + (r.peso ?? 0), 0);
    const vendMap = new Map<string, { peso: number; pedidos: number }>();
    filtered.forEach((r) => {
      const nome = r.vendedores?.nome_vendedor || "Sem vendedor";
      const entry = vendMap.get(nome) || { peso: 0, pedidos: 0 };
      entry.peso += r.peso ?? 0;
      entry.pedidos += 1;
      vendMap.set(nome, entry);
    });
    const vendedorRanking: VendedorRanking[] = Array.from(vendMap.entries())
      .map(([nome, v]) => ({
        nome,
        ...v,
        participacao: totalPesoAll > 0 ? Math.round((v.peso / totalPesoAll) * 1000) / 10 : 0,
        mediaPorPedido: v.pedidos > 0 ? Math.round(v.peso / v.pedidos) : 0,
      }))
      .sort((a, b) => b.peso - a.peso)
      .slice(0, 15);

    // === 3. Distribuição por UF ===
    const ufMap = new Map<string, { peso: number; pedidos: number }>();
    filtered.forEach((r) => {
      const uf = r.uf || "N/I";
      const entry = ufMap.get(uf) || { peso: 0, pedidos: 0 };
      entry.peso += r.peso ?? 0;
      entry.pedidos += 1;
      ufMap.set(uf, entry);
    });
    const ufDistribution: UfDistribution[] = Array.from(ufMap.entries())
      .map(([uf, v]) => ({
        uf,
        ...v,
        participacao: totalPesoAll > 0 ? Math.round((v.peso / totalPesoAll) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.peso - a.peso);

    // === 4. Taxa de ruptura diária ===
    const ruptMap = new Map<string, { total: number; rupturas: number }>();
    filtered.forEach((r) => {
      const d = r.data;
      const entry = ruptMap.get(d) || { total: 0, rupturas: 0 };
      entry.total += 1;
      if (r.ruptura) entry.rupturas += 1;
      ruptMap.set(d, entry);
    });
    const rupturaDaily: RupturaDaily[] = Array.from(ruptMap.entries())
      .map(([date, v]) => ({
        date,
        ...v,
        taxa: v.total > 0 ? Math.round((v.rupturas / v.total) * 100) : 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // === 5. Status breakdown ===
    const statusMap = new Map<string, { count: number; peso: number }>();
    filtered.forEach((r) => {
      const s = r.status || "Aguardando";
      const entry = statusMap.get(s) || { count: 0, peso: 0 };
      entry.count += 1;
      entry.peso += r.peso ?? 0;
      statusMap.set(s, entry);
    });
    const statusBreakdown: StatusBreakdown[] = Array.from(statusMap.entries())
      .map(([status, v]) => ({ status, ...v }))
      .sort((a, b) => b.count - a.count);

    // === 6. Tipo caminhão breakdown ===
    const tipoMap = new Map<string, { peso: number; pedidos: number }>();
    filtered.forEach((r) => {
      const tipo = r.tipo_caminhao || "N/I";
      const entry = tipoMap.get(tipo) || { peso: 0, pedidos: 0 };
      entry.peso += r.peso ?? 0;
      entry.pedidos += 1;
      tipoMap.set(tipo, entry);
    });
    const tipoCaminhaoBreakdown: TipoCaminhaoBreakdown[] = Array.from(tipoMap.entries())
      .map(([tipo, v]) => ({ tipo, ...v }))
      .sort((a, b) => b.peso - a.peso);

    // === 7. Daily by tipo caminhao (stacked) ===
    const dailyTipoMap = new Map<string, Record<string, number>>();
    const allTipos = new Set<string>();
    filtered.forEach((r) => {
      const d = r.data;
      const tipo = r.tipo_caminhao || "N/I";
      allTipos.add(tipo);
      if (!dailyTipoMap.has(d)) dailyTipoMap.set(d, {});
      const entry = dailyTipoMap.get(d)!;
      entry[tipo] = (entry[tipo] || 0) + (r.peso ?? 0);
    });
    const dailyByTipo: DailyByTipo[] = Array.from(dailyTipoMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, tipos]) => ({ date, ...tipos }));
    const tipoKeys = Array.from(allTipos);

    // === 8. Produto rupturas ranking ===
    const prodRuptMap = new Map<string, number>();
    filtered.filter((r) => r.ruptura).forEach((r) => {
      const prod = r.nome_produto || "N/I";
      prodRuptMap.set(prod, (prodRuptMap.get(prod) || 0) + 1);
    });
    const produtoRupturas: ProdutoRuptura[] = Array.from(prodRuptMap.entries())
      .map(([produto, rupturas]) => ({ produto, rupturas }))
      .sort((a, b) => b.rupturas - a.rupturas)
      .slice(0, 10);

    // === 9. Heatmap semanal de rupturas ===
    const heatmap: HeatmapCell[] = [];
    ruptMap.forEach((v, dateStr) => {
      const d = new Date(dateStr + "T12:00:00");
      heatmap.push({
        week: getISOWeek(d),
        dayOfWeek: getDay(d),
        date: dateStr,
        taxa: v.total > 0 ? Math.round((v.rupturas / v.total) * 100) : 0,
        rupturas: v.rupturas,
        total: v.total,
      });
    });

    // === 10. KPIs with comparison ===
    const totalPeso = filtered.reduce((s, r) => s + (r.peso ?? 0), 0);
    const totalPedidos = filtered.length;
    const totalRupturas = filtered.filter((r) => r.ruptura).length;
    const totalCarregado = filtered.filter((r) => r.status === "Carregado").reduce((s, r) => s + (r.peso ?? 0), 0);
    const diasUnicos = new Set(filtered.map((r) => r.data)).size;
    const mediaDiaria = diasUnicos > 0 ? Math.round(totalPeso / diasUnicos) : 0;
    const taxaRuptura = totalPedidos > 0 ? Math.round((totalRupturas / totalPedidos) * 100) : 0;

    // Ruptura-specific KPIs
    const diasSemRuptura = rupturaDaily.filter((d) => d.rupturas === 0).length;
    const piorDia = rupturaDaily.reduce((best, d) => (d.taxa > (best?.taxa ?? 0) ? d : best), null as RupturaDaily | null);
    const mediaSemanal = rupturaDaily.length > 0 ? Math.round(totalRupturas / Math.max(1, Math.ceil(rupturaDaily.length / 7))) : 0;

    const kpis: KpiComparison = {
      totalPeso,
      totalPedidos,
      totalRupturas,
      totalCarregado,
      diasUnicos,
      mediaDiaria,
      taxaRuptura,
      varPeso: calcVar(totalPeso, prevPeso),
      varPedidos: calcVar(totalPedidos, prevPedidos),
      varRupturas: calcVar(totalRupturas, prevRupturas),
      varCarregado: calcVar(totalCarregado, prevCarregado),
      varMediaDiaria: calcVar(mediaDiaria, prevMedia),
      varTaxaRuptura: calcVar(taxaRuptura, prevTaxaRuptura),
    };

    // Unique values for filters
    const uniqueVendedores = Array.from(new Set(raw.map((r) => r.vendedores?.nome_vendedor || "Sem vendedor"))).sort();
    const uniqueTipos = Array.from(new Set(raw.map((r) => r.tipo_caminhao || "N/I"))).sort();
    const uniqueUfs = Array.from(new Set(raw.map((r) => r.uf || "N/I"))).sort();

    return {
      dailyWeight,
      vendedorRanking,
      ufDistribution,
      rupturaDaily,
      statusBreakdown,
      tipoCaminhaoBreakdown,
      dailyByTipo,
      tipoKeys,
      produtoRupturas,
      heatmap,
      kpis,
      rupturaKpis: { diasSemRuptura, piorDia, mediaSemanal },
      filterOptions: { uniqueVendedores, uniqueTipos, uniqueUfs },
    };
  }, [query.data, filters.vendedores, filters.tipoCaminhao, filters.ufs]);

  return { ...query, analytics };
}
