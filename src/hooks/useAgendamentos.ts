import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useEffect } from "react";

export interface Agendamento {
  id: string;
  data: string;
  doca: string;
  horario_inicio: string;
  horario_fim: string;
  carga_id: string | null;
  nome_carga: string | null;
  placa: string | null;
  motorista: string | null;
  transportadora: string | null;
  status: string;
  observacoes: string | null;
  criado_por: string | null;
  created_at: string;
}

export function useAgendamentos(date: string) {
  const qc = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel("agendamentos-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "agendamentos" }, () => {
        qc.invalidateQueries({ queryKey: ["agendamentos"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [qc]);

  return useQuery({
    queryKey: ["agendamentos", date],
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from("agendamentos")
        .select("*")
        .eq("data", date)
        .order("horario_inicio", { ascending: true });
      if (error) throw error;
      return rows as Agendamento[];
    },
    staleTime: 30_000,
  });
}

export function useCreateAgendamento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: Record<string, any>) => {
      const { data, error } = await supabase.from("agendamentos").insert(values).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agendamentos"] });
      toast.success("Agendamento criado");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpdateAgendamento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...values }: Record<string, any>) => {
      const { data, error } = await supabase.from("agendamentos").update(values).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agendamentos"] });
      toast.success("Agendamento atualizado");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeleteAgendamento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("agendamentos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agendamentos"] });
      toast.success("Agendamento excluído");
    },
    onError: (e: any) => toast.error(e.message),
  });
}
