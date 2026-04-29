import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useEffect, useCallback, useRef } from "react";
import { useSession } from "@/hooks/useAuth";

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
  ordem_entrega: number | null;
  peso_original: number | null;
  quantidade_original: number | null;
  motivo_ruptura: string | null;
  created_at: string;
  updated_at: string;
  vendedores?: { nome_vendedor: string } | null;
};

export type RealtimeStatus = "connecting" | "connected" | "disconnected";

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
      let q = supabase
        .from("carregamentos_dia")
        .select("*, vendedores(nome_vendedor)");

      const isSingleDay = dateFrom === dateEnd;

      if (isSingleDay && dateFrom === todayStr) {
        // Today: also bring pending items from previous days
        // Limit pending items to last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const limitDate = thirtyDaysAgo.toISOString().split("T")[0];
        q = q.or(`data.eq.${dateFrom},and(data.lt.${dateFrom},data.gte.${limitDate},status.neq.Carregado)`);
      } else if (isSingleDay) {
        q = q.eq("data", dateFrom);
      } else {
        q = q.gte("data", dateFrom).lte("data", dateEnd);
      }

      const { data, error } = await q.order("created_at", { ascending: true });
      if (error) throw error;
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
      // Use Promise.all but with a single connection context
      const results = await Promise.all(
        updates.map(({ id, ...values }) =>
          supabase.from("carregamentos_dia").update(values).eq("id", id).select().single()
        )
      );
      // 23505 (unique violation) é tratado como sucesso silencioso —
      // protege contra raras colisões em cascade de irmãos.
      const firstError = results.find(r => r.error && (r.error as any).code !== "23505");
      if (firstError?.error) throw firstError.error;
      return results.map(r => r.data);
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
      // Let realtime handle ongoing sync
    },
  });
}

export function useUpdateCarregamento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...values }: Record<string, any>) => {
      const { data, error } = await supabase.from("carregamentos_dia").update(values).eq("id", id).select().single();
      if (error) throw error;
      return data;
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
      // Passive invalidation: marks cache stale so the next focus/refetch
      // resyncs from the DB. We don't trigger an immediate refetch — realtime
      // is still the primary sync — but if realtime is disconnected this
      // ensures the UI eventually catches up.
      qc.invalidateQueries({ queryKey: ["carregamentos"], refetchType: "none" });
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
      since.setDate(since.getDate() - 2);
      const sinceStr = since.toISOString().slice(0, 10);

      const { data: cargas, error } = await supabase
        .from("carregamentos_dia")
        .select("carga_id, nome_carga, placa, motorista, transportadora, tipo_caminhao, peso, data")
        .eq("etapa", "logistica")
        .not("carga_id", "is", null)
        .gte("data", sinceStr);
      if (error) throw error;

      const cargasArr = (cargas ?? []) as any[];
      if (cargasArr.length === 0) return [] as CargaFechadaAguardando[];

      const cargaIds = Array.from(new Set(cargasArr.map((c) => c.carga_id).filter(Boolean)));
      const { data: movs } = await supabase
        .from("movimentacoes_portaria")
        .select("id, carga_id, tipo_movimento, horario_entrada, horario_chegada, data_hora")
        .in("carga_id", cargaIds);
      // Mapeia carga_id -> info da entrada mais recente (se houver)
      const entradaPorCarga = new Map<string, { id: string; horario_entrada: string | null; horario_chegada: string | null; data_hora: string | null }>();
      const finalizadaCarga = new Set<string>();
      for (const m of ((movs ?? []) as any[])) {
        if (!m.carga_id) continue;
        if (m.tipo_movimento === "saida") {
          finalizadaCarga.add(m.carga_id);
          continue;
        }
        if (m.tipo_movimento === "entrada") {
          const prev = entradaPorCarga.get(m.carga_id);
          if (!prev || (m.data_hora && prev.data_hora && m.data_hora > prev.data_hora)) {
            entradaPorCarga.set(m.carga_id, {
              id: m.id,
              horario_entrada: m.horario_entrada,
              horario_chegada: m.horario_chegada,
              data_hora: m.data_hora,
            });
          }
        }
      }

      const grouped = new Map<string, CargaFechadaAguardando>();
      for (const c of cargasArr) {
        if (!c.carga_id) continue;
        if (finalizadaCarga.has(c.carga_id)) continue;
        const entrada = entradaPorCarga.get(c.carga_id);
        // Se já tem entrada com horario_entrada preenchido, está no pátio — não listar
        if (entrada && entrada.horario_entrada) continue;
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
      since.setDate(since.getDate() - 3);
      const sinceStr = since.toISOString().slice(0, 10);

      const { data, error } = await supabase
        .from("carregamentos_dia")
        .select("carga_id, nome_carga, placa, motorista, transportadora, tipo_caminhao, peso, data")
        .eq("etapa", "logistica")
        .not("carga_id", "is", null)
        .gte("data", sinceStr);
      if (error) throw error;
      const arr = (data ?? []) as any[];

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
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["veiculos_walkin_ativos"] });
      qc.invalidateQueries({ queryKey: ["veiculos_walkin_pendentes_count"] });
      qc.invalidateQueries({ queryKey: ["veiculos_esperados_pendentes"] });
      qc.invalidateQueries({ queryKey: ["veiculos_esperados"] });
      qc.invalidateQueries({ queryKey: ["cargas_fechadas_aguardando"] });
      qc.invalidateQueries({ queryKey: ["cargas_fechadas_para_vincular"] });
      qc.invalidateQueries({ queryKey: ["carregamentos"] });
      toast.success("Carga vinculada — veículo liberado para entrada");
    },
    onError: (e: any) => toast.error(e.message || "Erro ao vincular carga"),
  });
}
