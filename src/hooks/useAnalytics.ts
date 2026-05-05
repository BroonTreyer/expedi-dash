import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemo } from "react";
import { useSession } from "@/hooks/useAuth";
import { format, subDays, differenceInDays } from "date-fns";
import { fetchAllPaginated } from "@/lib/supabase-paginate";

// Status que contam como expedição válida (Peso Total / Carregado).
// "Pendente / Problema", "Cancelado", etc NÃO somam — não é peso real expedido.
const VALID_STATUS = new Set([
  "Aguardando",
  "Pronto para carregar",
  "Carregando",
  "Carregado",
]);
const LOADED_STATUS = "Carregado";
const ROW_LIMIT = 50000; // teto de segurança; paginação real busca tudo

export interface AnalyticsFilters {
  dateFrom: string;
  dateTo: string;
  vendedores?: string[];
  tipoCaminhao?: string[];
  ufs?: string[];
}

interface DailyWeight {
  date: string;
  peso: number;
  carregado: number;
  acumulado: number;
}

interface VendedorRanking {
  nome: string;
  peso: number;
  pedidos: number;
  participacao: number;
  mediaPorPedido: number;
}

interface UfDistribution {
  uf: string;
  peso: number;
  pedidos: number;
  participacao: number;
}

interface RupturaDaily {
  date: string;
  total: number;
  rupturas: number;
  taxa: number;
}

interface StatusBreakdown {
  status: string;
  count: number;
  peso: number;
}

interface TipoCaminhaoBreakdown {
  tipo: string;
  peso: number;
  pedidos: number;
}

interface DailyByTipo {
  date: string;
  [tipo: string]: string | number;
}

interface ProdutoRuptura {
  produto: string;
  rupturas: number;
  peso: number;
  pesoNaoCarregado: number;
}

interface ClienteRuptura {
  codigo: string;
  nome: string;
  ocorrencias: number;
  pesoNaoCarregado: number;
  produtos: string[];
}

interface CargaPendencia {
  cargaId: string;
  nomeCarga: string;
  ocorrencias: number;
  pesoNaoCarregado: number;
  motoristas: string[];
}

interface KpiComparison {
  totalPeso: number;
  totalPedidos: number;
  totalRupturas: number;
  totalCarregado: number;
  diasUnicos: number;
  diasPeriodo: number;
  mediaDiaria: number;
  taxaRuptura: number;
  totalPedidosUnicos: number;
  pedidosComRuptura: number;
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

// Pedidos únicos (numero_pedido distinto). Linhas sem numero_pedido contam
// como "pedido avulso" individual para não desaparecerem do total.
function countUniquePedidos(rows: any[]): number {
  const ids = new Set<number>();
  let avulsos = 0;
  for (const r of rows) {
    if (r.numero_pedido != null) ids.add(r.numero_pedido);
    else avulsos += 1;
  }
  return ids.size + avulsos;
}

function uniquePedidosWithRuptura(rows: any[]): number {
  const ids = new Set<number>();
  let avulsos = 0;
  for (const r of rows) {
    if (!r.ruptura) continue;
    if (r.numero_pedido != null) ids.add(r.numero_pedido);
    else avulsos += 1;
  }
  return ids.size + avulsos;
}

export function useAnalytics(filters: AnalyticsFilters) {
  const session = useSession();

  // Período anterior do mesmo tamanho. Sem off-by-one.
  // Ex.: 1–30/abr (30 dias) compara com 2–31/mar (30 dias).
  const daysDiff = differenceInDays(new Date(filters.dateTo), new Date(filters.dateFrom));
  const periodDays = daysDiff + 1;
  const prevTo = format(subDays(new Date(filters.dateFrom), 1), "yyyy-MM-dd");
  const prevFrom = format(subDays(new Date(filters.dateFrom), periodDays), "yyyy-MM-dd");

  const query = useQuery({
    queryKey: ["analytics-v5", filters.dateFrom, filters.dateTo],
    enabled: !!session,
    queryFn: async () => {
      // Mesmas colunas nos dois períodos para que filtros (vendedor/uf/tipo)
      // afetem o comparativo corretamente.
      const cols =
        "data, peso, peso_original, motivo_ruptura, status, vendedor_id, ruptura, ruptura_sinalizada, uf, tipo_caminhao, nome_produto, numero_pedido, cliente, codigo_cliente, carga_id, nome_carga, motorista, vendedores(nome_vendedor)";
      // Paginação real: o limit do PostgREST por requisição é 1.000, então
      // qualquer período razoável era truncado e os totais saíam errados.
      // Mantemos um teto absoluto (ROW_LIMIT) por segurança.
      const [current, previous] = await Promise.all([
        fetchAllPaginated<any>((from, to) =>
          supabase
            .from("carregamentos_dia")
            .select(cols)
            .gte("data", filters.dateFrom)
            .lte("data", filters.dateTo)
            .order("data", { ascending: true })
            .order("id", { ascending: true })
            .range(from, Math.min(to, ROW_LIMIT - 1)),
        ),
        fetchAllPaginated<any>((from, to) =>
          supabase
            .from("carregamentos_dia")
            .select(cols)
            .gte("data", prevFrom)
            .lte("data", prevTo)
            .order("data", { ascending: true })
            .order("id", { ascending: true })
            .range(from, Math.min(to, ROW_LIMIT - 1)),
        ),
      ]);
      return {
        current,
        previous,
        truncated: current.length >= ROW_LIMIT || previous.length >= ROW_LIMIT,
      };
    },
    staleTime: 60_000,
  });

  const analytics = useMemo(() => {
    const raw = query.data?.current ?? [];
    const prevRaw = query.data?.previous ?? [];
    const truncated = query.data?.truncated ?? false;

    // Filtros aplicados nos DOIS períodos (atual e anterior).
    const applyFilters = (rows: any[]) =>
      rows.filter((r) => {
        if (filters.vendedores?.length && !filters.vendedores.includes(r.vendedores?.nome_vendedor || "Sem vendedor")) return false;
        if (filters.tipoCaminhao?.length && !filters.tipoCaminhao.includes(r.tipo_caminhao || "N/I")) return false;
        if (filters.ufs?.length && !filters.ufs.includes(r.uf || "N/I")) return false;
        return true;
      });
    const filtered = applyFilters(raw);
    const prevFiltered = applyFilters(prevRaw);

    // Subset com status válidos para Peso/Carregado (exclui Pendente/Cancelado)
    const filteredValid = filtered.filter((r) => VALID_STATUS.has(r.status));
    const prevValid = prevFiltered.filter((r) => VALID_STATUS.has(r.status));

    // === Período anterior — mesma regra ===
    const prevPeso = prevValid.reduce((s, r) => s + (r.peso ?? 0), 0);
    const prevPedidosUnicos = countUniquePedidos(prevFiltered);
    const prevPedidosComRuptura = uniquePedidosWithRuptura(prevFiltered);
    const prevCarregado = prevValid
      .filter((r) => r.status === LOADED_STATUS && !r.ruptura)
      .reduce((s, r) => s + (r.peso ?? 0), 0);
    const prevMedia = periodDays > 0 ? Math.round(prevPeso / periodDays) : 0;
    const prevTaxaRuptura = prevPedidosUnicos > 0
      ? Math.round((prevPedidosComRuptura / prevPedidosUnicos) * 100)
      : 0;

    // === 1. Peso diário + acumulado (status válidos apenas) ===
    const dailyMap = new Map<string, { peso: number; carregado: number }>();
    filteredValid.forEach((r) => {
      const entry = dailyMap.get(r.data) || { peso: 0, carregado: 0 };
      entry.peso += r.peso ?? 0;
      if (r.status === LOADED_STATUS) entry.carregado += r.peso ?? 0;
      dailyMap.set(r.data, entry);
    });
    let acumulado = 0;
    const dailyWeight: DailyWeight[] = Array.from(dailyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => {
        acumulado += v.peso;
        return { date, ...v, acumulado };
      });

    // === 2. Ranking vendedores ===
    // Pedidos = numero_pedido únicos. % calculada sobre vendedores identificados
    // (exclui "Sem vendedor" do denominador para não distorcer a participação).
    const vendAgg = new Map<string, { peso: number; pedidoSet: Set<number>; avulsos: number }>();
    filteredValid.forEach((r) => {
      const nome = r.vendedores?.nome_vendedor || "Sem vendedor";
      const e = vendAgg.get(nome) || { peso: 0, pedidoSet: new Set<number>(), avulsos: 0 };
      e.peso += r.peso ?? 0;
      if (r.numero_pedido != null) e.pedidoSet.add(r.numero_pedido);
      else e.avulsos += 1;
      vendAgg.set(nome, e);
    });
    const pesoVendIdentificados = Array.from(vendAgg.entries())
      .filter(([n]) => n !== "Sem vendedor")
      .reduce((s, [, v]) => s + v.peso, 0);
    const vendedorRanking: VendedorRanking[] = Array.from(vendAgg.entries())
      .map(([nome, v]) => {
        const pedidos = v.pedidoSet.size + v.avulsos;
        return {
          nome,
          peso: v.peso,
          pedidos,
          participacao:
            pesoVendIdentificados > 0 && nome !== "Sem vendedor"
              ? Math.round((v.peso / pesoVendIdentificados) * 1000) / 10
              : 0,
          mediaPorPedido: pedidos > 0 ? Math.round(v.peso / pedidos) : 0,
        };
      })
      .sort((a, b) => b.peso - a.peso)
      .slice(0, 15);

    // === 3. Distribuição por UF (exclui "N/I" do ranking) ===
    const ufAgg = new Map<string, { peso: number; pedidoSet: Set<number>; avulsos: number }>();
    filteredValid.forEach((r) => {
      const uf = r.uf || "N/I";
      const e = ufAgg.get(uf) || { peso: 0, pedidoSet: new Set<number>(), avulsos: 0 };
      e.peso += r.peso ?? 0;
      if (r.numero_pedido != null) e.pedidoSet.add(r.numero_pedido);
      else e.avulsos += 1;
      ufAgg.set(uf, e);
    });
    const pesoUfIdentificadas = Array.from(ufAgg.entries())
      .filter(([uf]) => uf !== "N/I")
      .reduce((s, [, v]) => s + v.peso, 0);
    const ufDistribution: UfDistribution[] = Array.from(ufAgg.entries())
      .filter(([uf]) => uf !== "N/I")
      .map(([uf, v]) => ({
        uf,
        peso: v.peso,
        pedidos: v.pedidoSet.size + v.avulsos,
        participacao:
          pesoUfIdentificadas > 0 ? Math.round((v.peso / pesoUfIdentificadas) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.peso - a.peso);
    const ufNI = ufAgg.get("N/I");
    const semUfStats = {
      peso: ufNI?.peso ?? 0,
      pedidos: (ufNI?.pedidoSet.size ?? 0) + (ufNI?.avulsos ?? 0),
    };

    // === 4. Taxa de ruptura diária — por pedido único do dia ===
    type RDay = { pedidoSet: Set<number>; rupturaSet: Set<number>; avulsosT: number; avulsosR: number };
    const ruptDayAgg = new Map<string, RDay>();
    filtered.forEach((r) => {
      const e: RDay = ruptDayAgg.get(r.data) || {
        pedidoSet: new Set<number>(),
        rupturaSet: new Set<number>(),
        avulsosT: 0,
        avulsosR: 0,
      };
      if (r.numero_pedido != null) {
        e.pedidoSet.add(r.numero_pedido);
        if (r.ruptura) e.rupturaSet.add(r.numero_pedido);
      } else {
        e.avulsosT += 1;
        if (r.ruptura) e.avulsosR += 1;
      }
      ruptDayAgg.set(r.data, e);
    });
    const rupturaDaily: RupturaDaily[] = Array.from(ruptDayAgg.entries())
      .map(([date, v]) => {
        const total = v.pedidoSet.size + v.avulsosT;
        const rupturas = v.rupturaSet.size + v.avulsosR;
        return {
          date,
          total,
          rupturas,
          taxa: total > 0 ? Math.round((rupturas / total) * 100) : 0,
        };
      })
      .sort((a, b) => a.date.localeCompare(b.date));

    // === 5. Status breakdown (todos os status — visão completa) ===
    const statusMap = new Map<string, { count: number; peso: number }>();
    filtered.forEach((r) => {
      const s = r.status || "Aguardando";
      const e = statusMap.get(s) || { count: 0, peso: 0 };
      e.count += 1;
      e.peso += r.peso ?? 0;
      statusMap.set(s, e);
    });
    const statusBreakdown: StatusBreakdown[] = Array.from(statusMap.entries())
      .map(([status, v]) => ({ status, ...v }))
      .sort((a, b) => b.count - a.count);

    // === 6. Tipo caminhão breakdown (status válidos, pedidos únicos) ===
    const tipoAgg = new Map<string, { peso: number; pedidoSet: Set<number>; avulsos: number }>();
    filteredValid.forEach((r) => {
      const tipo = r.tipo_caminhao || "N/I";
      const e = tipoAgg.get(tipo) || { peso: 0, pedidoSet: new Set<number>(), avulsos: 0 };
      e.peso += r.peso ?? 0;
      if (r.numero_pedido != null) e.pedidoSet.add(r.numero_pedido);
      else e.avulsos += 1;
      tipoAgg.set(tipo, e);
    });
    const tipoCaminhaoBreakdown: TipoCaminhaoBreakdown[] = Array.from(tipoAgg.entries())
      .map(([tipo, v]) => ({ tipo, peso: v.peso, pedidos: v.pedidoSet.size + v.avulsos }))
      .sort((a, b) => b.peso - a.peso);

    // === 7. Daily por tipo caminhão (stacked) ===
    const dailyTipoMap = new Map<string, Record<string, number>>();
    const allTipos = new Set<string>();
    filteredValid.forEach((r) => {
      const tipo = r.tipo_caminhao || "N/I";
      allTipos.add(tipo);
      if (!dailyTipoMap.has(r.data)) dailyTipoMap.set(r.data, {});
      const entry = dailyTipoMap.get(r.data)!;
      entry[tipo] = (entry[tipo] || 0) + (r.peso ?? 0);
    });
    const dailyByTipo: DailyByTipo[] = Array.from(dailyTipoMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, tipos]) => ({ date, ...tipos }));
    const tipoKeys = Array.from(allTipos);

    // === 8. Produto rupturas (independe de status) ===
    const prodRuptMap = new Map<string, { count: number; peso: number; pesoNaoCarregado: number }>();
    const isParcial = (r: any) => !r.ruptura && (r.peso_original ?? 0) > (r.peso ?? 0);
    filtered.filter((r) => r.ruptura || isParcial(r)).forEach((r) => {
      const prod = r.nome_produto || "N/I";
      const e = prodRuptMap.get(prod) || { count: 0, peso: 0, pesoNaoCarregado: 0 };
      e.count += 1;
      e.peso += r.peso ?? 0;
      const original = r.peso_original ?? r.peso ?? 0;
      const perdido = r.ruptura ? original : Math.max(0, original - (r.peso ?? 0));
      e.pesoNaoCarregado += perdido;
      prodRuptMap.set(prod, e);
    });
    const produtoRupturas: ProdutoRuptura[] = Array.from(prodRuptMap.entries())
      .map(([produto, v]) => ({ produto, rupturas: v.count, peso: v.peso, pesoNaoCarregado: v.pesoNaoCarregado }))
      .sort((a, b) => b.pesoNaoCarregado - a.pesoNaoCarregado)
      .slice(0, 10);

    // === Peso não carregado por dia (totais + parciais) ===
    const naoCarregadoMap = new Map<string, { planejado: number; efetivo: number; perdido: number }>();
    filtered.forEach((r) => {
      const e = naoCarregadoMap.get(r.data) || { planejado: 0, efetivo: 0, perdido: 0 };
      const original = r.peso_original ?? r.peso ?? 0;
      const efetivo = r.ruptura ? 0 : (r.peso ?? 0);
      e.planejado += original;
      e.efetivo += efetivo;
      e.perdido += Math.max(0, original - efetivo);
      naoCarregadoMap.set(r.data, e);
    });
    const dailyPlanejadoVsEfetivo = Array.from(naoCarregadoMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({ date, planejado: v.planejado, efetivo: v.efetivo, perdido: v.perdido }));

    // === Breakdown por motivo ===
    const motivoMap = new Map<string, { count: number; peso: number }>();
    filtered.filter((r) => r.ruptura || isParcial(r)).forEach((r) => {
      const motivo = r.motivo_ruptura || "Não informado";
      const e = motivoMap.get(motivo) || { count: 0, peso: 0 };
      e.count += 1;
      const original = r.peso_original ?? r.peso ?? 0;
      e.peso += r.ruptura ? original : Math.max(0, original - (r.peso ?? 0));
      motivoMap.set(motivo, e);
    });
    const motivoBreakdown = Array.from(motivoMap.entries())
      .map(([motivo, v]) => ({ motivo, count: v.count, peso: v.peso }))
      .sort((a, b) => b.peso - a.peso);

    // === Totais de ruptura no período ===
    const totalPesoNaoCarregado = filtered.reduce((s, r) => {
      const original = r.peso_original ?? r.peso ?? 0;
      const efetivo = r.ruptura ? 0 : (r.peso ?? 0);
      return s + Math.max(0, original - efetivo);
    }, 0);
    const totalRupturasParciais = filtered.filter(isParcial).length;
    const totalRupturasTotais = filtered.filter((r) => r.ruptura).length;

    // === Clientes afetados por ruptura (total ou parcial) ===
    const clienteAgg = new Map<string, { nome: string; ocorrencias: number; pesoNaoCarregado: number; produtos: Set<string> }>();
    filtered.filter((r) => r.ruptura || isParcial(r)).forEach((r) => {
      const codigo = r.codigo_cliente || "S/CÓD";
      const nome = r.cliente || "Sem cliente";
      const key = codigo + "|" + nome;
      const e = clienteAgg.get(key) || { nome, ocorrencias: 0, pesoNaoCarregado: 0, produtos: new Set<string>() };
      e.ocorrencias += 1;
      const original = r.peso_original ?? r.peso ?? 0;
      e.pesoNaoCarregado += r.ruptura ? original : Math.max(0, original - (r.peso ?? 0));
      if (r.nome_produto) e.produtos.add(r.nome_produto);
      clienteAgg.set(key, e);
    });
    const clienteRupturas: ClienteRuptura[] = Array.from(clienteAgg.entries())
      .map(([key, v]) => ({
        codigo: key.split("|")[0],
        nome: v.nome,
        ocorrencias: v.ocorrencias,
        pesoNaoCarregado: v.pesoNaoCarregado,
        produtos: Array.from(v.produtos),
      }))
      .sort((a, b) => b.pesoNaoCarregado - a.pesoNaoCarregado)
      .slice(0, 15);

    // === Cargas com pendência ===
    const cargaAgg = new Map<string, { nome: string; ocorrencias: number; pesoNaoCarregado: number; motoristas: Set<string> }>();
    filtered.filter((r) => (r.ruptura || isParcial(r)) && r.carga_id).forEach((r) => {
      const e = cargaAgg.get(r.carga_id) || {
        nome: r.nome_carga || r.carga_id,
        ocorrencias: 0,
        pesoNaoCarregado: 0,
        motoristas: new Set<string>(),
      };
      e.ocorrencias += 1;
      const original = r.peso_original ?? r.peso ?? 0;
      e.pesoNaoCarregado += r.ruptura ? original : Math.max(0, original - (r.peso ?? 0));
      if (r.motorista) e.motoristas.add(r.motorista);
      cargaAgg.set(r.carga_id, e);
    });
    const cargasComPendencia: CargaPendencia[] = Array.from(cargaAgg.entries())
      .map(([cargaId, v]) => ({
        cargaId,
        nomeCarga: v.nome,
        ocorrencias: v.ocorrencias,
        pesoNaoCarregado: v.pesoNaoCarregado,
        motoristas: Array.from(v.motoristas),
      }))
      .sort((a, b) => b.pesoNaoCarregado - a.pesoNaoCarregado)
      .slice(0, 15);

    // === 9. KPIs (com comparativo correto) ===
    const totalPeso = filteredValid.reduce((s, r) => s + (r.peso ?? 0), 0);
    const totalCarregado = filteredValid
      .filter((r) => r.status === LOADED_STATUS && !r.ruptura)
      .reduce((s, r) => s + (r.peso ?? 0), 0);
    const diasUnicos = new Set(filtered.map((r) => r.data)).size;
    const mediaDiaria = periodDays > 0 ? Math.round(totalPeso / periodDays) : 0;

    const totalPedidosUnicos = countUniquePedidos(filtered);
    const pedidosComRuptura = uniquePedidosWithRuptura(filtered);
    const totalPedidos = totalPedidosUnicos;
    const totalRupturas = pedidosComRuptura;
    const taxaRuptura = totalPedidosUnicos > 0
      ? Math.round((pedidosComRuptura / totalPedidosUnicos) * 100)
      : 0;

    // Sinalizadas: separar abertas vs resolvidas
    const sinalizadasAbertas = filtered.filter((r) => r.ruptura_sinalizada && r.ruptura).length;
    const sinalizadasResolvidas = filtered.filter((r) => r.ruptura_sinalizada && !r.ruptura).length;
    const totalSinalizadas = sinalizadasAbertas + sinalizadasResolvidas;

    // Pior Dia: exige volume mínimo para evitar 1/1 = 100%
    const MIN_PEDIDOS_PIOR_DIA = 10;
    const piorDia = rupturaDaily
      .filter((d) => d.total >= MIN_PEDIDOS_PIOR_DIA)
      .reduce((best, d) => (d.taxa > (best?.taxa ?? -1) ? d : best), null as RupturaDaily | null);
    const diasSemRuptura = rupturaDaily.filter((d) => d.rupturas === 0).length;
    const semanasPeriodo = Math.max(1, Math.ceil(periodDays / 7));
    const mediaSemanal = Math.round(totalRupturas / semanasPeriodo);

    const kpis: KpiComparison = {
      totalPeso,
      totalPedidos,
      totalRupturas,
      totalCarregado,
      diasUnicos,
      diasPeriodo: periodDays,
      mediaDiaria,
      taxaRuptura,
      totalPedidosUnicos,
      pedidosComRuptura,
      varPeso: calcVar(totalPeso, prevPeso),
      varPedidos: calcVar(totalPedidos, prevPedidosUnicos),
      varRupturas: calcVar(totalRupturas, prevPedidosComRuptura),
      varCarregado: calcVar(totalCarregado, prevCarregado),
      varMediaDiaria: calcVar(mediaDiaria, prevMedia),
      varTaxaRuptura: calcVar(taxaRuptura, prevTaxaRuptura),
    };

    // Opções para filtros (todos os valores presentes — sem filtrar)
    const uniqueVendedores = Array.from(new Set(raw.map((r) => r.vendedores?.nome_vendedor || "Sem vendedor"))).sort();
    const uniqueTipos = Array.from(new Set(raw.map((r) => r.tipo_caminhao || "N/I"))).sort();
    const uniqueUfs = Array.from(new Set(raw.map((r) => r.uf || "N/I"))).sort();

    return {
      dailyWeight,
      vendedorRanking,
      ufDistribution,
      semUfStats,
      rupturaDaily,
      statusBreakdown,
      tipoCaminhaoBreakdown,
      dailyByTipo,
      tipoKeys,
      produtoRupturas,
      kpis,
      rupturaKpis: {
        diasSemRuptura,
        piorDia,
        mediaSemanal,
        totalSinalizadas,
        sinalizadasAbertas,
        sinalizadasResolvidas,
        totalPesoNaoCarregado,
        totalRupturasParciais,
        totalRupturasTotais,
      },
      dailyPlanejadoVsEfetivo,
      motivoBreakdown,
      clienteRupturas,
      cargasComPendencia,
      filterOptions: { uniqueVendedores, uniqueTipos, uniqueUfs },
      truncated,
    };
  }, [query.data, filters.vendedores, filters.tipoCaminhao, filters.ufs, periodDays]);

  return { ...query, analytics };
}