import { useEffect } from "react";
import { useQuery, keepPreviousData, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useAuth";
import { pesoEfetivo } from "@/lib/peso-utils";
import { fetchAllPaginated } from "@/lib/supabase-paginate";
import { computeDataEfetivaTerceirizada } from "@/lib/data-efetiva";

export interface CargaDiaExpedicao {
  carga_id: string;
  nome_carga: string | null;
  placa: string | null;
  motorista: string | null;
  transportadora: string | null;
  tipo_caminhao: string | null;
  data: string;
  pesoTotal: number; // soma de pesoEfetivo (descarta rupturas totais)
  qtdPedidos: number;
  status: string | null; // status agregado (Carregado se TODOS os itens estão Carregado)
}

/**
 * Cargas terceirizadas da data informada, agregadas por carga_id.
 * Mesma lógica de peso usada no Consolidado: pesoEfetivo (rupturas totais = 0).
 * Inclui carry-over de cargas dos últimos 30 dias com status != "Carregado"
 * quando a data for hoje (igual ao Consolidado).
 */
export function useCargasDiaExpedicao(dateStr: string) {
  const session = useSession();
  const queryClient = useQueryClient();

  // Realtime: qualquer alteração em carregamentos_dia atualiza o painel
  // (KPIs de peso, "Cargas expedidas do dia") em ~1s.
  useEffect(() => {
    if (!session) return;
    const channel = supabase
      .channel(`cargas-dia-expedicao-${dateStr}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "carregamentos_dia" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["cargas_dia_expedicao"] });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "movimentacoes_portaria" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["cargas_dia_expedicao"] });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [dateStr, session, queryClient]);

  return useQuery({
    queryKey: ["cargas_dia_expedicao", dateStr],
    enabled: !!session,
    staleTime: 10_000,
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
    retry: 2,
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const data = await fetchAllPaginated<any>((from, to) =>
        supabase
          .from("carregamentos_dia")
          .select("carga_id, nome_carga, placa, motorista, transportadora, tipo_caminhao, peso, ruptura, data, numero_pedido, status, id, updated_at")
          .not("carga_id", "is", null)
          .neq("etapa", "pre_carga")
          .eq("data", dateStr)
          .order("id", { ascending: true })
          .range(from, to),
      );
      let rows = (data ?? []) as any[];

      // === Data efetiva: trazer cargas TERCEIRIZADAS de outros dias cuja
      // saída pela portaria caiu hoje. Assim o peso vai para o dia correto.
      const startOfDay = `${dateStr}T00:00:00`;
      const endOfDay = `${dateStr}T23:59:59.999`;
      const { data: saidasHoje } = await supabase
        .from("movimentacoes_portaria")
        .select("carga_id")
        .eq("categoria", "terceirizado")
        .not("carga_id", "is", null)
        .not("horario_saida_final", "is", null)
        .gte("horario_saida_final", startOfDay)
        .lte("horario_saida_final", endOfDay);
      const cargaIdsSaidaHoje = Array.from(
        new Set(((saidasHoje ?? []) as { carga_id: string | null }[])
          .map((m) => m.carga_id)
          .filter((v): v is string => !!v))
      );
      const presentes = new Set(rows.map((r) => r.carga_id).filter(Boolean) as string[]);
      const faltantes = cargaIdsSaidaHoje.filter((cid) => !presentes.has(cid));
      if (faltantes.length > 0) {
        const trintaDiasAtras = new Date();
        trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);
        const limit = trintaDiasAtras.toISOString().split("T")[0];
        const extra = await fetchAllPaginated<any>((from, to) =>
          supabase
            .from("carregamentos_dia")
            .select("carga_id, nome_carga, placa, motorista, transportadora, tipo_caminhao, peso, ruptura, data, numero_pedido, status, id, updated_at")
            .in("carga_id", faltantes)
            .neq("etapa", "pre_carga")
            .lt("data", dateStr)
            .gte("data", limit)
            .order("id", { ascending: true })
            .range(from, to),
        );
        if (extra && extra.length > 0) rows = [...rows, ...extra];
      }

      // Buscar saídas das cargas terceirizadas presentes (para reatribuir
      // data efetiva: cargas cuja data original = dateStr mas saíram em outro
      // dia devem SAIR deste dia).
      //
      // IMPORTANTE: o mesmo `carga_id` pode ser reutilizado em datas diferentes
      // (ex.: "EDIVAR", "JR"). Por isso só consideramos saídas cujo
      // `horario_saida_final` seja >= a data da carga atual — saídas mais
      // antigas são de cargas anteriores com o mesmo nome e não devem
      // reatribuir o dia da carga de hoje.
      const cargaIdsTerc = Array.from(new Set(
        rows
          .filter((r: any) => !!r.transportadora && r.carga_id)
          .map((r: any) => r.carga_id as string)
      ));
      // menor data entre as cargas presentes (limite global da consulta)
      const dataPorCarga = new Map<string, string>();
      for (const r of rows) {
        if (!r.carga_id || !r.transportadora || !r.data) continue;
        const prev = dataPorCarga.get(r.carga_id);
        if (!prev || r.data < prev) dataPorCarga.set(r.carga_id, r.data);
      }
      const saidaPorCarga = new Map<string, string>();
      if (cargaIdsTerc.length > 0) {
        const minData = Array.from(dataPorCarga.values()).sort()[0];
        let q = supabase
          .from("movimentacoes_portaria")
          .select("carga_id, horario_saida_final")
          .eq("categoria", "terceirizado")
          .in("carga_id", cargaIdsTerc)
          .not("horario_saida_final", "is", null);
        if (minData) q = q.gte("horario_saida_final", `${minData}T00:00:00`);
        const { data: todasSaidas } = await q;
        for (const m of (todasSaidas ?? []) as { carga_id: string | null; horario_saida_final: string | null }[]) {
          if (!m.carga_id || !m.horario_saida_final) continue;
          // descarta saídas anteriores à data da própria carga (carga_id reaproveitado)
          const dataCarga = dataPorCarga.get(m.carga_id);
          if (dataCarga && m.horario_saida_final < `${dataCarga}T00:00:00`) continue;
          const prev = saidaPorCarga.get(m.carga_id);
          if (!prev || m.horario_saida_final > prev) saidaPorCarga.set(m.carga_id, m.horario_saida_final);
        }
      }

      const grouped = new Map<string, CargaDiaExpedicao & { pedidos: Set<number>; statuses: Set<string> }>();
      for (const r of rows) {
        if (!r.carga_id) continue;
        // Apenas terceirizado: tem transportadora preenchida
        if (!r.transportadora) continue;
        let g = grouped.get(r.carga_id);
        if (!g) {
          g = {
            carga_id: r.carga_id,
            nome_carga: r.nome_carga,
            placa: r.placa,
            motorista: r.motorista,
            transportadora: r.transportadora,
            tipo_caminhao: r.tipo_caminhao,
            data: r.data,
            pesoTotal: 0,
            qtdPedidos: 0,
            pedidos: new Set<number>(),
            status: null,
            statuses: new Set<string>(),
          };
          grouped.set(r.carga_id, g);
        }
        g.pesoTotal += pesoEfetivo({ peso: r.peso, ruptura: !!r.ruptura });
        if (r.numero_pedido != null) g.pedidos.add(Number(r.numero_pedido));
        if (r.status) g.statuses.add(String(r.status));
      }

      // Itens por carga (para computar data efetiva via updated_at)
      const itensPorCarga = new Map<string, any[]>();
      for (const r of rows) {
        if (!r.carga_id || !r.transportadora) continue;
        const arr = itensPorCarga.get(r.carga_id) ?? [];
        arr.push(r);
        itensPorCarga.set(r.carga_id, arr);
      }

      const list = Array.from(grouped.values()).map(({ pedidos, statuses, ...rest }) => {
        const itens = itensPorCarga.get(rest.carga_id) ?? [];
        const saidaIso = saidaPorCarga.get(rest.carga_id) ?? null;
        const dataEfetiva = computeDataEfetivaTerceirizada(
          itens,
          rest.data,
          saidaIso,
          new Date().toISOString().slice(0, 10),
        );
        return {
          ...rest,
          data: dataEfetiva,
          qtdPedidos: pedidos.size,
          status:
            statuses.size === 1
              ? Array.from(statuses)[0]
              : statuses.has("Carregando")
                ? "Carregando"
                : statuses.size > 0
                  ? Array.from(statuses)[0]
                  : null,
        };
      }) as CargaDiaExpedicao[];

      // Mantém somente cargas cuja data efetiva é o dia consultado
      return list.filter((c) => c.data === dateStr);
    },
  });
}
