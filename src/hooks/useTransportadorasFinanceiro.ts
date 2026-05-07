import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useAuth";
import { toast } from "sonner";

export type TransportadoraFin = {
  id: string;
  nome: string;
  codigo: string | null;
  cnpj: string | null;
  pix_chave: string | null;
  pix_tipo: "cpf" | "cnpj" | "email" | "telefone" | "aleatoria" | null;
  banco: string | null;
  agencia: string | null;
  conta: string | null;
  percentual_adiantamento_padrao: number;
  ativo: boolean;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
};

export function useTransportadorasFinanceiro() {
  const session = useSession();
  return useQuery({
    queryKey: ["transportadoras_financeiro"],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("transportadoras_financeiro")
        .select("*")
        .order("nome", { ascending: true });
      if (error) throw error;
      return (data ?? []) as TransportadoraFin[];
    },
    staleTime: 60_000,
  });
}

export function useUpsertTransportadoraFin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: Partial<TransportadoraFin> & { nome: string }) => {
      const payload: any = { ...row, nome: row.nome.trim().toUpperCase() };
      if (row.id) {
        const { data, error } = await (supabase as any)
          .from("transportadoras_financeiro")
          .update(payload)
          .eq("id", row.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
      const { data: u } = await supabase.auth.getUser();
      const { data, error } = await (supabase as any)
        .from("transportadoras_financeiro")
        .insert({ ...payload, created_by: u.user?.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transportadoras_financeiro"] });
      toast.success("Transportadora salva");
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao salvar"),
  });
}

export function useDeleteTransportadoraFin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("transportadoras_financeiro").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transportadoras_financeiro"] });
      toast.success("Removida");
    },
    onError: (e: any) => toast.error(e.message ?? "Erro"),
  });
}