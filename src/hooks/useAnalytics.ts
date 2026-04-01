import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemo } from "react";

export interface AnalyticsFilters {
  dateFrom: string;
  dateTo: string;
  vendedor?: string;
  tipoCaminhao?: string;
}

export interface DailyWeight {
  date: string;
  peso: number;
  carregado: number;
}

export interface VendedorRanking {
  nome: string;
  peso: number;
  pedidos: number;
}

export interface UfDistribution {
  uf: string;
  peso: number;
  pedidos: number;
}

export interface RupturaDaily {
  date: string;
  total: number;
  rupturas: number;
  taxa: number;
}

export function useAnalytics(filters: AnalyticsFilters) {
  const query = useQuery({
    queryKey: ["analytics", filters.dateFrom, filters.dateTo],
    queryFn: async () => {
      // Fetch all data in the range
      let q = supabase
        .from("carregamentos_dia")
        .select("data, peso, status, vendedor_id, ruptura, uf, tipo_caminhao, vendedores(nome_vendedor)")
        .gte("data", filters.dateFrom)
        .lte("data", filters.dateTo)
        .order("data", { ascending: true });

      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
    staleTime: 60_000,
  });

  const analytics = useMemo(() => {
    const raw = query.data ?? [];

    // 1. Peso diário
    const dailyMap = new Map<string, { peso: number; carregado: number }>();
    raw.forEach((r) => {
      const d = r.data;
      const entry = dailyMap.get(d) || { peso: 0, carregado: 0 };
      entry.peso += r.peso ?? 0;
      if (r.status === "Carregado") entry.carregado += r.peso ?? 0;
      dailyMap.set(d, entry);
    });
    const dailyWeight: DailyWeight[] = Array.from(dailyMap.entries())
      .map(([date, v]) => ({ date, ...v }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // 2. Ranking vendedores
    const vendMap = new Map<string, { peso: number; pedidos: number }>();
    raw.forEach((r) => {
      const nome = r.vendedores?.nome_vendedor || "Sem vendedor";
      const entry = vendMap.get(nome) || { peso: 0, pedidos: 0 };
      entry.peso += r.peso ?? 0;
      entry.pedidos += 1;
      vendMap.set(nome, entry);
    });
    const vendedorRanking: VendedorRanking[] = Array.from(vendMap.entries())
      .map(([nome, v]) => ({ nome, ...v }))
      .sort((a, b) => b.peso - a.peso)
      .slice(0, 10);

    // 3. Distribuição por UF
    const ufMap = new Map<string, { peso: number; pedidos: number }>();
    raw.forEach((r) => {
      const uf = r.uf || "N/I";
      const entry = ufMap.get(uf) || { peso: 0, pedidos: 0 };
      entry.peso += r.peso ?? 0;
      entry.pedidos += 1;
      ufMap.set(uf, entry);
    });
    const ufDistribution: UfDistribution[] = Array.from(ufMap.entries())
      .map(([uf, v]) => ({ uf, ...v }))
      .sort((a, b) => b.peso - a.peso);

    // 4. Taxa de ruptura diária
    const ruptMap = new Map<string, { total: number; rupturas: number }>();
    raw.forEach((r) => {
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

    // 5. KPIs resumo
    const totalPeso = raw.reduce((s, r) => s + (r.peso ?? 0), 0);
    const totalPedidos = raw.length;
    const totalRupturas = raw.filter((r) => r.ruptura).length;
    const totalCarregado = raw.filter((r) => r.status === "Carregado").reduce((s, r) => s + (r.peso ?? 0), 0);
    const diasUnicos = new Set(raw.map((r) => r.data)).size;
    const mediaDiaria = diasUnicos > 0 ? Math.round(totalPeso / diasUnicos) : 0;

    return {
      dailyWeight,
      vendedorRanking,
      ufDistribution,
      rupturaDaily,
      kpis: { totalPeso, totalPedidos, totalRupturas, totalCarregado, diasUnicos, mediaDiaria },
    };
  }, [query.data]);

  return { ...query, analytics };
}
