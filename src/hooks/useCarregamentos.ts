import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useEffect, useCallback, useRef } from "react";
import { useSession } from "@/hooks/useAuth";
import { fetchAllPaginated } from "@/lib/supabase-paginate";

// Debounce timer for realtime INSERT invalidation
let insertDebounceTimer: ReturnType<typeof setTimeout> | null = null;

export type Carregamento = {
  id: string;
  data: string;
  vendedor_id: string | null;
  codigo_produto: string | null;
  nome_produto: string | null;
  quantidade: number | null;
  peso: number | null;
  peso_manual: boolean;
  transportadora: string | null;
  tipo_caminhao: string | null;
  placa: string | null;
  motorista: string | null;
  cidade: string | null;
  uf: string | null;
  cliente: string | null;
  codigo_cliente: string | null;
  horario_previsto: string | null;
  horario_inicio: string | null;
  horario_fim: string | null;
  tipo_frete: string | null;
  numero_pedido: number | null;
  status: string;
  etapa: string;
  observacoes: string | null;
  ruptura: boolean;
  carga_id: string | null;
  nome_carga: string | null;
  ordem_carga: string | null;
  ordem_entrega: number | null;
  peso_original: number | null;
  quantidade_original: number | null;
  motivo_ruptura: string | null;
  created_at: string;
  updated_at: string;
  vendedores?: { nome_vendedor: string } | null;
};

type RealtimeStatus = "connecting" | "connected" | "disconnected";

export function useCarregamentos(dateFrom: string, dateTo?: string) {
  const dateEnd = dateTo || dateFrom;
  const queryClient = useQueryClient();
  const session = useSession();
  const realtimeStatusRef = useRef<RealtimeStatus>("connecting");
  const statusCallbackRef = useRef<((s: RealtimeStatus) => void) | null>(null);

  useEffect(() => {
    const channel = supabase
      .channel("carregamentos-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "carregamentos_dia" },
        () => {
          // Debounce INSERT invalidations to avoid refetch storms during batch operations
          if (insertDebounceTimer) clearTimeout(insertDebounceTimer);
          insertDebounceTimer = setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ["carregamentos"] });
            insertDebounceTimer = null;
          }, 1500);
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "carregamentos_dia" },
        (payload) => {
          const updated = payload.new as any;
          queryClient.setQueriesData<Carregamento[]>(
            { queryKey: ["carregamentos"] },
            (old) => {
              if (!old) return old;
              return old.map((item) => {
                if (item.id !== updated.id) return item;
                const merged = { ...item, ...updated };
                if (updated.vendedores === undefined && item.vendedores) {
                  merged.vendedores = item.vendedores;
                }
                return merged;
              });
            }
          );
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "carregamentos_dia" },
        (payload) => {
          const deleted = payload.old as any;
          queryClient.setQueriesData<Carregamento[]>(
            { queryKey: ["carregamentos"] },
            (old) => {
              if (!old) return old;
              return old.filter((item) => item.id !== deleted.id);
            }
          );
        }
      )
      .subscribe((state) => {
        const s: RealtimeStatus =
          state === "SUBSCRIBED" ? "connected" :
          state === "CLOSED" || state === "CHANNEL_ERROR" ? "disconnected" :
          "connecting";
        realtimeStatusRef.current = s;
        statusCallbackRef.current?.(s);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const subscribeStatus = useCallback((cb: (s: RealtimeStatus) => void) => {
    statusCallbackRef.current = cb;
    cb(realtimeStatusRef.current);
    return () => { statusCallbackRef.current = null; };
  }, []);

  const query = useQuery({
    queryKey: ["carregamentos", dateFrom, dateEnd],
    enabled: !!session,
    queryFn: async () => {
      const todayStr = new Date().toISOString().split("T")[0];
      const isSingleDay = dateFrom === dateEnd;
      // Paginação completa para o painel principal não truncar quando há
      // muitos itens no dia (1000+ linhas).
      const data = await fetchAllPaginated<any>((from, to) => {
        let q = supabase
          .from("carregamentos_dia")
          .select("*, vendedores(nome_vendedor)");
        if (isSingleDay && dateFrom === todayStr) {
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          const limitDate = thirtyDaysAgo.toISOString().split("T")[0];
          q = q.or(`data.eq.${dateFrom},and(data.lt.${dateFrom},data.gte.${limitDate},status.neq.Carregado)`);
        } else if (isSingleDay) {
          q = q.eq("data", dateFrom);
        } else {
          q = q.gte("data", dateFrom).lte("data", dateEnd);
        }
        return q
          .order("created_at", { ascending: true })
          .order("id", { ascending: true })
          .range(from, to);
      });
      // Esconde rascunhos e pedidos aguardando aprovação do faturamento
      // do painel operacional principal.
      const filtered = (data as Carregamento[]).filter(
        (c) => c.etapa !== "rascunho" && c.etapa !== "aguardando_faturamento",
      );
      // Dedup defensivo por id — protege a UI contra qualquer linha
      // duplicada que tenha entrado no banco antes da correção (legacy).
      const seen = new Set<string>();
      const deduped = filtered.filter((c) => {
        if (seen.has(c.id)) return false;
        seen.add(c.id);
        return true;
      });
      return deduped;
    },
    staleTime: 30_000,
  });

  return { ...query, subscribeStatus };
}

export function useCreateCarregamento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: Record<string, any>) => {
      // Idempotência: gera chave por linha se não vier do chamador.
      // Esta chave é única no banco (índice parcial) e bloqueia
      // duplicatas geradas por duplo-clique, retry de rede ou refresh.
      const opId = (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`);
      const payload = {
        ...values,
        operation_id: values.operation_id ?? opId,
        row_op_key: values.row_op_key ?? `${opId}__0`,
      };
      const { data, error } = await supabase
        .from("carregamentos_dia")
        .insert(payload)
        .select()
        .single();
      // 23505 = unique violation => mesma operação chegou duas vezes.
      // Tratamos como sucesso silencioso (idempotência).
      if (error && (error as any).code === "23505") return null;
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["carregamentos"] });
      toast.success("Carregamento criado");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

/** Batch insert — creates multiple carregamentos in a single request */
export function useBatchCreateCarregamento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rows: Record<string, any>[]) => {
      if (rows.length === 0) return [];
      // Idempotência por lote: um único operation_id para o lote inteiro
      // e uma row_op_key por linha (operation_id + índice).
      // Garante que se o mesmo lote chegar duas vezes, o banco bloqueia.
      const opId = (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`);
      const payload = rows.map((r, idx) => ({
        ...r,
        operation_id: r.operation_id ?? opId,
        row_op_key: r.row_op_key ?? `${r.operation_id ?? opId}__${idx}`,
      }));
      const { data, error } = await supabase
        .from("carregamentos_dia")
        .insert(payload)
        .select();
      if (error && (error as any).code === "23505") {
        // Mesmo lote já gravado — idempotência silenciosa.
        return [];
      }
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["carregamentos"] });
      const n = data?.length ?? 0;
      if (n > 0) toast.success(`${n} pedido(s) criado(s)`);
    },
    onError: (e: any) => toast.error(e.message),
  });
}

/** Batch update — updates multiple carregamentos in a single request */
export function useBatchUpdateCarregamento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (updates: { id: string;[key: string]: any }[]) => {
      if (updates.length === 0) return [];
      // IMPORTANTE: NÃO usar `.single()`. Quando RLS oculta a linha (ou o id
      // simplesmente não existe mais), `.single()` devolve PGRST116 e aborta
      // o lote inteiro — o que escondia silenciosamente cargas em que só o
      // primeiro item era persistido. Aqui usamos `.select()` puro e
      // detectamos linhas que voltaram vazias para reportar IDs específicos.
      const results = await Promise.all(
        updates.map(async ({ id, ...values }) => {
          const res = await supabase
            .from("carregamentos_dia")
            .update(values)
            .eq("id", id)
            .select("id");
          return { id, error: res.error, rows: res.data ?? [] };
        })
      );
      // Em UPDATE, 23505 NÃO é idempotência: indica que estamos tentando gravar
      // uma chave única já existente (ex.: row_op_key duplicada por payload herdado).
      // Tratar como sucesso aqui escondia falhas reais — agora reportamos.
      const realErrors = results.filter((r) => !!r.error);
      // Linhas que voltaram 0 rows = update bloqueado por RLS ou id sumiu.
      const noRowIds = results
        .filter((r) => !r.error && r.rows.length === 0)
        .map((r) => r.id);
      if (realErrors.length > 0) {
        const msg = realErrors
          .map((r) => `${r.id.slice(0, 8)}: ${r.error?.message ?? "erro"}`)
          .join(" | ");
        throw new Error(
          `Falha ao salvar ${realErrors.length}/${updates.length} item(ns): ${msg}`
        );
      }
      if (noRowIds.length > 0) {
        throw new Error(
          `${noRowIds.length}/${updates.length} item(ns) não foram salvos (sem permissão ou registro removido). IDs: ${noRowIds
            .map((id) => id.slice(0, 8))
            .join(", ")}`
        );
      }
      return results.map((r) => ({ id: r.id }));
    },
    onMutate: async (updates) => {
      await qc.cancelQueries({ queryKey: ["carregamentos"] });
      const previousQueries = qc.getQueriesData<Carregamento[]>({ queryKey: ["carregamentos"] });
      qc.setQueriesData<Carregamento[]>(
        { queryKey: ["carregamentos"] },
        (old) => {
          if (!old) return old;
          const updateMap = new Map(updates.map(u => [u.id, u]));
          return old.map((item) => {
            const upd = updateMap.get(item.id);
            return upd ? { ...item, ...upd } : item;
          });
        }
      );
      return { previousQueries };
    },
    onError: (e: any, _vars, context) => {
      if (context?.previousQueries) {
        for (const [key, data] of context.previousQueries) {
          qc.setQueryData(key, data);
        }
      }
      toast.error(e.message);
    },
    onSettled: () => {
      // Refetch ativo: garante que telas dependentes (ex.: Rupturas → Faltando agora)
      // vejam a versão final do banco — incluindo campos reescritos por triggers
      // (peso_original, ruptura_sinalizada) — sem depender só do Realtime.
      qc.invalidateQueries({ queryKey: ["carregamentos"] });
    },
  });
}

export function useUpdateCarregamento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...values }: Record<string, any>) => {
      // Sem `.single()`: se RLS bloqueia ou o id sumiu, queremos detectar
      // explicitamente em vez de tomar PGRST116 e perder a operação inteira.
      const { data, error } = await supabase
        .from("carregamentos_dia")
        .update(values)
        .eq("id", id)
        .select("id");
      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error(
          `Item ${String(id).slice(0, 8)} não foi salvo (sem permissão ou registro removido).`
        );
      }
      return data[0];
    },
    onMutate: async (variables) => {
      const { id, ...values } = variables;
      // Cancel outgoing refetches
      await qc.cancelQueries({ queryKey: ["carregamentos"] });
      // Snapshot previous value
      const previousQueries = qc.getQueriesData<Carregamento[]>({ queryKey: ["carregamentos"] });
      // Optimistically update all matching queries
      qc.setQueriesData<Carregamento[]>(
        { queryKey: ["carregamentos"] },
        (old) => {
          if (!old) return old;
          return old.map((item) =>
            item.id === id ? { ...item, ...values } : item
          );
        }
      );
      return { previousQueries };
    },
    onError: (e: any, _vars, context) => {
      // Rollback on error
      if (context?.previousQueries) {
        for (const [key, data] of context.previousQueries) {
          qc.setQueryData(key, data);
        }
      }
      toast.error(e.message);
    },
    onSettled: () => {
      // Refetch ativo: força resync imediato após edição. Antes era passivo,
      // o que deixava telas dependentes (Rupturas) com cache antigo quando
      // o Realtime atrasava ou estava em background.
      qc.invalidateQueries({ queryKey: ["carregamentos"] });
    },
  });
}

/** Batch delete — deletes multiple carregamentos in a single request */
export function useBatchDeleteCarregamento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      if (ids.length === 0) return 0;
      const { error, count } = await supabase
        .from("carregamentos_dia")
        .delete({ count: "exact" })
        .in("id", ids);
      if (error) throw error;
      if (count === 0) throw new Error("Sem permissão para excluir. Apenas administradores, logística e faturamento podem deletar registros.");
      return count ?? ids.length;
    },
    onMutate: async (ids) => {
      await qc.cancelQueries({ queryKey: ["carregamentos"] });
      const previousQueries = qc.getQueriesData<Carregamento[]>({ queryKey: ["carregamentos"] });
      const idSet = new Set(ids);
      qc.setQueriesData<Carregamento[]>(
        { queryKey: ["carregamentos"] },
        (old) => old ? old.filter((item) => !idSet.has(item.id)) : old
      );
      return { previousQueries };
    },
    onSuccess: (count) => {
      toast.success(`${count} item(ns) do pedido excluído(s)`);
    },
    onError: (e: any, _ids, context) => {
      if (context?.previousQueries) {
        for (const [key, data] of context.previousQueries) {
          qc.setQueryData(key, data);
        }
      }
      toast.error(e.message);
    },
  });
}

export function useDeleteCarregamento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error, count } = await supabase.from("carregamentos_dia").delete({ count: "exact" }).eq("id", id);
      if (error) throw error;
      if (count === 0) throw new Error("Sem permissão para excluir. Apenas administradores e logística podem deletar registros.");
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ["carregamentos"] });
      const previousQueries = qc.getQueriesData<Carregamento[]>({ queryKey: ["carregamentos"] });
      qc.setQueriesData<Carregamento[]>(
        { queryKey: ["carregamentos"] },
        (old) => old ? old.filter((item) => item.id !== id) : old
      );
      return { previousQueries };
    },
    onSuccess: () => {
      toast.success("Carregamento excluído");
    },
    onError: (e: any, _id, context) => {
      if (context?.previousQueries) {
        for (const [key, data] of context.previousQueries) {
          qc.setQueryData(key, data);
        }
      }
      toast.error(e.message);
    },
  });
}

/**
 * Cargas fechadas (etapa=logistica) das últimas 48h cujo veículo ainda não chegou na portaria.
 */
export interface CargaFechadaAguardando {
  carga_id: string;
  nome_carga: string | null;
  placa: string | null;
  motorista: string | null;
  transportadora: string | null;
  tipo_caminhao: string | null;
  peso_total: number;
  qtd_pedidos: number;
  data: string;
  /** Se a chegada já foi registrada (movimento de entrada criado), mas ainda não liberou para o pátio */
  chegouAguardandoLiberacao?: boolean;
  movimentoChegadaId?: string | null;
  horarioChegada?: string | null;
}

export function useCargasFechadasAguardando() {
  const session = useSession();
  return useQuery({
    queryKey: ["cargas_fechadas_aguardando"],
    enabled: !!session,
    refetchInterval: 30000,
    queryFn: async () => {
      const since = new Date();
      // Janela de 7 dias: cargas podem ser fechadas alguns dias depois da
      // `data` planejada (ex.: pré-cargas montadas com data antiga). Janela
      // curta demais (2d) escondia cargas legítimas do painel azul.
      since.setDate(since.getDate() - 7);
      const sinceStr = since.toISOString().slice(0, 10);

      const cargasArr = await fetchAllPaginated<any>((from, to) =>
        supabase
          .from("carregamentos_dia")
          .select("carga_id, nome_carga, placa, motorista, transportadora, tipo_caminhao, peso, data, id")
          .eq("etapa", "logistica")
          .not("carga_id", "is", null)
          .gte("data", sinceStr)
          .order("id", { ascending: true })
          .range(from, to),
      );

      // Defesa: também trazer cargas que estão FORA da janela de 7 dias
      // mas que têm uma chegada pendente recente (motorista chegou na
      // portaria, ainda não foi liberado). Sem isso, cargas com `data`
      // antiga (ex.: planejada para semanas atrás) viram registros
      // fantasmas — o motorista chega, registra chegada, e some dos
      // painéis até alguém liberar.
      try {
        const since7d = new Date(Date.now() - 7 * 86400_000).toISOString();
        const { data: pendentes } = await supabase
          .from("movimentacoes_portaria")
          .select("carga_id")
          .eq("tipo_movimento", "entrada")
          .is("horario_entrada", null)
          .is("horario_real_saida", null)
          .is("horario_saida_final", null)
          .not("carga_id", "is", null)
          .gte("data_hora", since7d);
        const jaPresentes = new Set(cargasArr.map((c) => c.carga_id));
        const faltantes = Array.from(
          new Set(((pendentes ?? []) as any[]).map((p) => p.carga_id).filter((id) => id && !jaPresentes.has(id))),
        );
        if (faltantes.length > 0) {
          const extras = await fetchAllPaginated<any>((from, to) =>
            supabase
              .from("carregamentos_dia")
              .select("carga_id, nome_carga, placa, motorista, transportadora, tipo_caminhao, peso, data, id")
              .eq("etapa", "logistica")
              .in("carga_id", faltantes)
              .order("id", { ascending: true })
              .range(from, to),
          );
          if (extras.length > 0) cargasArr.push(...extras);
        }
      } catch {
        // Falha silenciosa: pior caso, o registro fica como já estava.
      }

      if (cargasArr.length === 0) return [] as CargaFechadaAguardando[];

      const cargaIds = Array.from(new Set(cargasArr.map((c) => c.carga_id).filter(Boolean)));
      const { data: movs } = await supabase
        .from("movimentacoes_portaria")
        .select("id, carga_id, tipo_movimento, horario_entrada, horario_chegada, data_hora, etapa_terceirizado, etapa_carga_propria, horario_real_saida, horario_saida_final, placa")
        .in("carga_id", cargaIds);
      // Defesa em profundidade: também busca chegadas órfãs (carga_id IS NULL)
      // por placa, para o caso do trigger não ter propagado o carga_id.
      const placasCargas = Array.from(new Set(
        cargasArr.map((c) => (c.placa || "").trim().toUpperCase()).filter(Boolean)
      ));
      let movsOrfaos: any[] = [];
      if (placasCargas.length > 0) {
        const { data: orfaos } = await supabase
          .from("movimentacoes_portaria")
          .select("id, carga_id, tipo_movimento, horario_entrada, horario_chegada, data_hora, etapa_terceirizado, etapa_carga_propria, horario_real_saida, horario_saida_final, placa")
          .in("placa", placasCargas)
          .eq("tipo_movimento", "entrada")
          .is("carga_id", null)
          .is("horario_entrada", null)
          .gte("data_hora", new Date(Date.now() - 7 * 86400_000).toISOString());
        movsOrfaos = orfaos ?? [];
      }
      const movsAll = [...((movs ?? []) as any[]), ...movsOrfaos];
      // Defesa adicional: alguns walk-ins chegam por fluxos que não criam
      // `movimentacoes_portaria` (ex.: importação de planilha + autorização
      // no fechamento). Para esses casos, consideramos o próprio
      // `veiculos_esperados` (walk_in autorizado/aguardando, ainda não
      // conferido) como sinal de "chegou aguardando liberação".
      let walkInsAtivos: any[] = [];
      {
        const { data: ve } = await supabase
          .from("veiculos_esperados" as any)
          .select("id, placa, carga_id, walk_in, conferido, status_autorizacao, autorizado_em, created_at")
          .in("carga_id", cargaIds)
          .eq("walk_in", true)
          .eq("conferido", false)
          .in("status_autorizacao", ["autorizado", "aguardando_vinculo", "aguardando_autorizacao"]);
        walkInsAtivos = (ve ?? []) as any[];
      }
      // A presença/ausência da carga neste painel é controlada exclusivamente
      // pelas movimentações reais (`entrada.horario_entrada`). Não usamos mais
      // `veiculos_esperados.conferido` aqui porque agora ele é marcado já no
      // ato de "Registrar Chegada" — antes do veículo entrar fisicamente no
      // pátio. Mantemos a carga visível com botão "Liberar entrada" até a
      // portaria liberar o veículo (preencher horario_entrada).
      // Mapeia (carga_id + data_carga) -> info de movimento, considerando
      // apenas movimentos dentro de uma janela operacional ao redor da
      // data da carga (de -12h até +48h). Sem isso, ciclos antigos com o
      // mesmo nome de carga (ex.: "JR MIX" reaproveitado) marcariam a
      // carga atual como "finalizada" indevidamente.
      const norm = (p: string | null | undefined) => (p || "").trim().toUpperCase();
      const dentroJanela = (cargaData: string, ts: string | null) => {
        if (!ts) return false;
        // Usa UTC para casar com `data_hora` (que vem em UTC do banco).
        // Antes usávamos `T00:00:00` (horário local) — em pt-BR (UTC-3) isso
        // descartava entradas legítimas registradas até ~3h após meia-noite UTC
        // do dia anterior, fazendo a carga continuar aparecendo como "aguardando".
        const base = new Date(`${cargaData}T00:00:00Z`).getTime();
        const ini = base - 12 * 3600_000;
        const fim = base + 48 * 3600_000;
        const t = new Date(ts).getTime();
        return Number.isFinite(t) && t >= ini && t <= fim;
      };
      // Guarda anti-ciclo-antigo: um movimento NUNCA pode finalizar/ocultar uma
      // carga se ele aconteceu muito antes da data planejada da carga. Sem isso,
      // quando o mesmo `carga_id` + placa é reaproveitado em ciclos diferentes
      // (ex.: rota recorrente "CARLOS MARABA" / placa TWD5I87), os movimentos
      // de saída/finalização do ciclo passado escondem silenciosamente a carga
      // nova do painel azul.
      const doCicloAtual = (cargaData: string | undefined, ts: string | null) => {
        if (!cargaData || !ts) return true; // sem dados, não bloqueia (comportamento antigo)
        const base = new Date(`${cargaData}T00:00:00Z`).getTime();
        const limiteInferior = base - 2 * 86400_000; // 2 dias antes do planejado
        const t = new Date(ts).getTime();
        if (!Number.isFinite(t)) return true;
        return t >= limiteInferior;
      };
      // Chave composta: carga_id pode ser reusado por viagens diferentes
      // (ex.: "JR" usado pelo Fagno num dia e pelo Célio em outro). Sem
      // distinguir por placa+data, os dois viravam um único item, herdando
      // os campos da primeira linha — incluindo `transportadora`, o que
      // misturava terceirizado em "carga própria" no painel.
      const groupKeyOf = (carga_id: string, placa: string | null | undefined, data: string | null | undefined) =>
        `${carga_id}|${norm(placa)}|${data ?? ""}`;

      // Indexa data e placa por chave composta para casar movimentações.
      const cargaDataByKey = new Map<string, string>();
      const cargaPlacaByKey = new Map<string, string>();
      const keysByCargaId = new Map<string, Set<string>>();
      for (const c of cargasArr) {
        if (!c.carga_id) continue;
        const k = groupKeyOf(c.carga_id, c.placa, c.data);
        if (!cargaDataByKey.has(k) && c.data) cargaDataByKey.set(k, c.data);
        if (!cargaPlacaByKey.has(k) && c.placa) cargaPlacaByKey.set(k, norm(c.placa));
        const set = keysByCargaId.get(c.carga_id) ?? new Set<string>();
        set.add(k);
        keysByCargaId.set(c.carga_id, set);
      }

      const entradaPorKey = new Map<string, { id: string; horario_entrada: string | null; horario_chegada: string | null; data_hora: string | null }>();
      const finalizadaKey = new Set<string>();
      // Index keys also por placa, para casar movimentos órfãos.
      const keysByPlaca = new Map<string, Set<string>>();
      for (const [k, placa] of cargaPlacaByKey.entries()) {
        const set = keysByPlaca.get(placa) ?? new Set<string>();
        set.add(k);
        keysByPlaca.set(placa, set);
      }
      for (const m of (movsAll as any[])) {
        const placaMov = norm(m.placa);
        let candidateKeys: Set<string> | undefined;
        if (m.carga_id) {
          candidateKeys = keysByCargaId.get(m.carga_id);
        } else if (placaMov) {
          // Movimento órfão (carga_id null) — casa por placa.
          candidateKeys = keysByPlaca.get(placaMov);
        }
        if (!candidateKeys) continue;
        // Detecta sinais inequívocos de finalização — saída ou etapa
        // finalizada. Estes finalizadores PRECISAM esconder a carga do
        // painel azul mesmo quando o movimento cai fora da janela
        // operacional (ex.: carga planejada para 15/05 mas expedida só
        // em 19/05). Antes, o filtro de janela descartava o movimento
        // e a carga voltava a aparecer indevidamente.
        const isFinalizer =
          m.tipo_movimento === "saida" ||
          m.etapa_terceirizado === "finalizado" ||
          m.etapa_carga_propria === "finalizado" ||
          !!m.horario_saida_final;
        if (isFinalizer) {
          for (const k of candidateKeys) {
            const placaCarga = cargaPlacaByKey.get(k);
            if (placaCarga && placaMov && placaMov !== placaCarga) continue;
            // Ignora finalizadores de ciclos anteriores (carga_id reaproveitado).
            if (!doCicloAtual(cargaDataByKey.get(k), m.data_hora)) continue;
            finalizadaKey.add(k);
          }
          continue;
        }
        // Veículo já no pátio (horario_entrada preenchido, sem saída final):
        // o cartão azul deve sumir IMEDIATAMENTE, independente da janela de
        // data da carga. Sem isso, cargas com data planejada antiga (ex.: 15/05)
        // e entrada hoje (19/05) ficam grudadas no painel azul.
        const jaNoPatio = m.tipo_movimento === "entrada"
          && !!m.horario_entrada
          && !m.horario_saida_final
          && m.etapa_terceirizado !== "finalizado"
          && m.etapa_carga_propria !== "finalizado";
        if (jaNoPatio) {
          for (const k of candidateKeys) {
            const placaCarga = cargaPlacaByKey.get(k);
            if (placaCarga && placaMov && placaMov !== placaCarga) continue;
            // Entrada antiga de ciclo anterior não deve esconder carga nova.
            if (!doCicloAtual(cargaDataByKey.get(k), m.data_hora)) continue;
            finalizadaKey.add(k);
          }
          continue;
        }
        // Resolve qual viagem (key) este movimento pertence, casando placa
        // (quando o movimento traz placa) e janela de data ao redor de cada
        // viagem candidata. Se não há placa no movimento, casa pela janela.
        let matchedKey: string | null = null;
        // Quando o movimento já traz `carga_id` exato (match por carga_id, não
        // por placa órfã), dispensamos o filtro de janela — o vínculo é direto
        // e seguro. Sem isso, chegadas registradas vários dias após a data
        // planejada da carga (operação atrasada) ficavam invisíveis aqui e o
        // card permanecia em "Registrar chegada do veículo" mesmo após o
        // INSERT ter sucesso.
        const matchedByCargaId = !!m.carga_id && keysByCargaId.has(m.carga_id);
        for (const k of candidateKeys) {
          const dCarga = cargaDataByKey.get(k);
          if (!dCarga) continue;
          if (!matchedByCargaId && !dentroJanela(dCarga, m.data_hora)) continue;
          const placaCarga = cargaPlacaByKey.get(k);
          if (placaCarga && placaMov && placaMov !== placaCarga) continue;
          matchedKey = k;
          // Preferimos um match com placa coincidente; já encontrado, paramos.
          if (placaCarga && placaMov) break;
        }
        if (!matchedKey) continue;
        if (m.tipo_movimento === "saida" || m.etapa_terceirizado === "finalizado" || m.etapa_carga_propria === "finalizado" || m.horario_saida_final) {
          finalizadaKey.add(matchedKey);
          continue;
        }
        if (m.tipo_movimento === "entrada") {
          const prev = entradaPorKey.get(matchedKey);
          if (!prev || (m.data_hora && prev.data_hora && m.data_hora > prev.data_hora)) {
            entradaPorKey.set(matchedKey, {
              id: m.id,
              horario_entrada: m.horario_entrada,
              horario_chegada: m.horario_chegada,
              data_hora: m.data_hora,
            });
          }
        }
      }
      // Indexa walk-ins ativos por (carga_id + placa) para encontrar o key
      // correspondente em `keysByCargaId`.
      for (const w of walkInsAtivos) {
        if (!w.carga_id) continue;
        const candidateKeys = keysByCargaId.get(w.carga_id);
        if (!candidateKeys) continue;
        const placaW = norm(w.placa);
        let matchedKey: string | null = null;
        for (const k of candidateKeys) {
          const placaCarga = cargaPlacaByKey.get(k);
          if (placaCarga && placaW && placaW !== placaCarga) continue;
          matchedKey = k;
          if (placaCarga && placaW) break;
        }
        if (!matchedKey) continue;
        if (finalizadaKey.has(matchedKey)) continue;
        if (entradaPorKey.has(matchedKey)) continue; // já tem movimentação, não sobrescreve
        entradaPorKey.set(matchedKey, {
          id: w.id, // walk-in id como fallback; liberarChegada já lida com isso
          horario_entrada: null,
          horario_chegada: w.autorizado_em ?? w.created_at ?? null,
          data_hora: w.autorizado_em ?? w.created_at ?? null,
        });
      }

      const grouped = new Map<string, CargaFechadaAguardando>();
      for (const c of cargasArr) {
        if (!c.carga_id) continue;
        const key = groupKeyOf(c.carga_id, c.placa, c.data);
        if (finalizadaKey.has(key)) continue;
        const entrada = entradaPorKey.get(key);
        // Se já tem entrada com horario_entrada preenchido, está no pátio — não listar
        if (entrada && entrada.horario_entrada) continue;
        const g = grouped.get(key);
        if (g) {
          g.peso_total += Number(c.peso) || 0;
          g.qtd_pedidos += 1;
          // Preencher campos que possam ter ficado nulos na primeira linha.
          if (!g.transportadora && c.transportadora) g.transportadora = c.transportadora;
          if (!g.motorista && c.motorista) g.motorista = c.motorista;
          if (!g.tipo_caminhao && c.tipo_caminhao) g.tipo_caminhao = c.tipo_caminhao;
        } else {
          grouped.set(key, {
            carga_id: c.carga_id,
            nome_carga: c.nome_carga,
            placa: c.placa,
            motorista: c.motorista,
            transportadora: c.transportadora,
            tipo_caminhao: c.tipo_caminhao,
            peso_total: Number(c.peso) || 0,
            qtd_pedidos: 1,
            data: c.data,
            chegouAguardandoLiberacao: !!entrada,
            movimentoChegadaId: entrada?.id ?? null,
            horarioChegada: entrada?.horario_chegada ?? entrada?.data_hora ?? null,
          });
        }
      }
      return Array.from(grouped.values()).sort((a, b) => (b.data > a.data ? 1 : -1));
    },
  });
}

/** Lista cargas fechadas das últimas 72h para vincular a um walk-in */
export function useCargasFechadasParaVincular() {
  const session = useSession();
  return useQuery({
    queryKey: ["cargas_fechadas_para_vincular"],
    enabled: !!session,
    refetchInterval: 30000,
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - 7);
      const sinceStr = since.toISOString().slice(0, 10);

      const arr = await fetchAllPaginated<any>((from, to) =>
        supabase
          .from("carregamentos_dia")
          .select("carga_id, nome_carga, placa, motorista, transportadora, tipo_caminhao, peso, data, id")
          .eq("etapa", "logistica")
          .not("carga_id", "is", null)
          .gte("data", sinceStr)
          .order("id", { ascending: true })
          .range(from, to),
      );

      const grouped = new Map<string, CargaFechadaAguardando>();
      for (const c of arr) {
        if (!c.carga_id) continue;
        const g = grouped.get(c.carga_id);
        if (g) {
          g.peso_total += Number(c.peso) || 0;
          g.qtd_pedidos += 1;
        } else {
          grouped.set(c.carga_id, {
            carga_id: c.carga_id,
            nome_carga: c.nome_carga,
            placa: c.placa,
            motorista: c.motorista,
            transportadora: c.transportadora,
            tipo_caminhao: c.tipo_caminhao,
            peso_total: Number(c.peso) || 0,
            qtd_pedidos: 1,
            data: c.data,
          });
        }
      }
      return Array.from(grouped.values()).sort((a, b) => (b.data > a.data ? 1 : -1));
    },
  });
}

/** Vincula um veículo walk-in a uma carga fechada */
export function useVincularWalkInACarga() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      veiculoEsperadoId: string;
      cargaId: string;
      placaReal: string;
      motoristaReal?: string | null;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const nowIso = new Date().toISOString();

      const { error: e1 } = await supabase
        .from("veiculos_esperados" as any)
        .update({
          status_autorizacao: "autorizado",
          carga_id: input.cargaId,
          autorizado_por: user?.id ?? null,
          autorizado_em: nowIso,
        } as any)
        .eq("id", input.veiculoEsperadoId);
      if (e1) throw e1;

      const updateData: Record<string, any> = { placa: input.placaReal };
      if (input.motoristaReal) updateData.motorista = input.motoristaReal;
      const { error: e2 } = await supabase
        .from("carregamentos_dia")
        .update(updateData)
        .eq("carga_id", input.cargaId);
      if (e2) throw e2;

      // Se já existe uma movimentação de chegada (etapa=chegada, sem carga_id ainda)
      // para esta placa, anexa a carga_id e o vínculo - sem mexer em horários.
      const placaNorm = input.placaReal.trim().toUpperCase();
      await supabase
        .from("movimentacoes_portaria")
        .update({ carga_id: input.cargaId } as any)
        .ilike("placa", placaNorm)
        .eq("tipo_movimento", "entrada")
        .is("horario_entrada", null)
        .is("carga_id", null);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["veiculos_walkin_ativos"] });
      qc.invalidateQueries({ queryKey: ["veiculos_walkin_pendentes_count"] });
      qc.invalidateQueries({ queryKey: ["veiculos_esperados_pendentes"] });
      qc.invalidateQueries({ queryKey: ["veiculos_esperados"] });
      qc.invalidateQueries({ queryKey: ["cargas_fechadas_aguardando"] });
      qc.invalidateQueries({ queryKey: ["cargas_fechadas_para_vincular"] });
      qc.invalidateQueries({ queryKey: ["carregamentos"] });
      qc.invalidateQueries({ queryKey: ["movimentacoes_portaria"] });
      toast.success("Carga vinculada — veículo liberado para entrada");
    },
    onError: (e: any) => toast.error(e.message || "Erro ao vincular carga"),
  });
}

/**
 * Vincula uma movimentação de chegada (terceirizado em `etapa_terceirizado='chegada'`
 * sem `carga_id`) a uma carga fechada — usado no painel "Aguardando Vínculo Logístico".
 * Diferente de useVincularWalkInACarga, este NÃO depende de um registro em
 * veiculos_esperados; opera direto sobre movimentacoes_portaria.
 */
export function useVincularMovimentoACarga() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      movimentoId: string;
      cargaId: string;
      placaReal: string;
      motoristaReal?: string | null;
      transportadoraReal?: string | null;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const placaNorm = (input.placaReal || "").trim().toUpperCase();

      // 1. Anexa carga_id ao movimento de chegada (mantém estado 'chegada' —
      //    a Portaria depois clica "Liberar Entrada no Pátio").
      const movUpdate: Record<string, any> = { carga_id: input.cargaId };
      if (input.transportadoraReal) movUpdate.empresa = input.transportadoraReal;
      const { error: e1 } = await supabase
        .from("movimentacoes_portaria")
        .update(movUpdate as any)
        .eq("id", input.movimentoId);
      if (e1) throw e1;

      // 2. Atualiza placa/motorista nos pedidos da carga, se ainda divergirem.
      const cargaUpdate: Record<string, any> = { placa: input.placaReal };
      if (input.motoristaReal) cargaUpdate.motorista = input.motoristaReal;
      const { error: e2 } = await supabase
        .from("carregamentos_dia")
        .update(cargaUpdate)
        .eq("carga_id", input.cargaId);
      if (e2) throw e2;

      // 3. Garante um registro em veiculos_esperados em estado
      //    `aguardando_vinculo` (NÃO autorizado ainda) para esta placa.
      //    Manter como aguardando_vinculo é essencial para que o veículo:
      //      - continue aparecendo no card vermelho da Portaria
      //      - apareça em "Veículos no pátio aguardando vínculo" do
      //        Fechar Carga, permitindo a Logística selecioná-lo e fechar
      //        a carga corretamente. A autorização efetiva é feita ao
      //        fechar a carga (FechamentoLoteDialog).
      const { data: veExistente } = await supabase
        .from("veiculos_esperados" as any)
        .select("id")
        .ilike("placa", placaNorm)
        .eq("conferido", false)
        .order("created_at", { ascending: false })
        .limit(1);

      if (veExistente && veExistente.length > 0) {
        const veId = (veExistente[0] as any).id;
        await supabase
          .from("veiculos_esperados" as any)
          .update({
            carga_id: input.cargaId,
            status_autorizacao: "aguardando_vinculo",
            autorizado_por: null,
            autorizado_em: null,
            motorista: input.motoristaReal ?? undefined,
            transportadora: input.transportadoraReal ?? undefined,
          } as any)
          .eq("id", veId);
      } else {
        await supabase
          .from("veiculos_esperados" as any)
          .insert({
            data_referencia: new Date().toISOString().slice(0, 10),
            grupo: "WALK-IN-TERCEIRIZADO",
            placa: placaNorm,
            motorista: input.motoristaReal ?? null,
            transportadora: input.transportadoraReal ?? null,
            carga_id: input.cargaId,
            status_autorizacao: "aguardando_vinculo",
            walk_in: true,
            conferido: false,
            autorizado_por: null,
            autorizado_em: null,
            criado_por: user?.id ?? null,
          } as any);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["movimentacoes_portaria"] });
      qc.invalidateQueries({ queryKey: ["movimentacoes_portaria_aguardando_vinculo"] });
      qc.invalidateQueries({ queryKey: ["cargas_fechadas_para_vincular"] });
      qc.invalidateQueries({ queryKey: ["cargas_fechadas_aguardando"] });
      qc.invalidateQueries({ queryKey: ["carregamentos"] });
      qc.invalidateQueries({ queryKey: ["veiculos_esperados"] });
      qc.invalidateQueries({ queryKey: ["veiculos_walkin_ativos"] });
      qc.invalidateQueries({ queryKey: ["veiculos_walkin_pendentes_count"] });
      toast.success("Carga vinculada — veículo liberado para entrada");
    },
    onError: (e: any) => toast.error(e.message || "Erro ao vincular carga"),
  });
}
