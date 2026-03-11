import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useEffect, useCallback, useRef } from "react";

export type Carregamento = {
  id: string;
  data: string;
  vendedor_id: string | null;
  codigo_produto: string | null;
  nome_produto: string | null;
  quantidade: number | null;
  peso: number | null;
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
  numero_pedido: number | null;
  status: string;
  etapa: string;
  observacoes: string | null;
  ruptura: boolean;
  created_at: string;
  updated_at: string;
  vendedores?: { nome_vendedor: string } | null;
};

export type RealtimeStatus = "connecting" | "connected" | "disconnected";

export function useCarregamentos(date: string) {
  const queryClient = useQueryClient();
  const realtimeStatusRef = useRef<RealtimeStatus>("connecting");
  const statusCallbackRef = useRef<((s: RealtimeStatus) => void) | null>(null);

  useEffect(() => {
    const channel = supabase
      .channel("carregamentos-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "carregamentos_dia" },
        (payload) => {
          // For inserts, invalidate to get full data with joins
          queryClient.invalidateQueries({ queryKey: ["carregamentos"] });
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "carregamentos_dia" },
        (payload) => {
          const updated = payload.new as any;
          // Patch cache directly instead of refetching
          queryClient.setQueriesData<Carregamento[]>(
            { queryKey: ["carregamentos"] },
            (old) => {
              if (!old) return old;
              return old.map((item) =>
                item.id === updated.id ? { ...item, ...updated } : item
              );
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
    queryKey: ["carregamentos", date],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("carregamentos_dia")
        .select("*, vendedores(nome_vendedor)")
        .eq("data", date)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as Carregamento[];
    },
    staleTime: 30_000,
  });

  return { ...query, subscribeStatus };
}

export function useCreateCarregamento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: Record<string, any>) => {
      // If numero_pedido not set, generate the next one for this date
      if (!values.numero_pedido && values.data) {
        const { data: nextNum } = await supabase.rpc("next_numero_pedido", { _data: values.data });
        values.numero_pedido = nextNum ?? 1;
      }
      const { data, error } = await supabase.from("carregamentos_dia").insert(values).select().single();
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
      // Don't invalidate — realtime will patch the cache
    },
  });
}

export function useDeleteCarregamento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("carregamentos_dia").delete().eq("id", id);
      if (error) throw error;
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
