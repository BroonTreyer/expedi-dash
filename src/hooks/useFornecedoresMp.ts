import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useAuth";
import { toast } from "sonner";

export type FornecedorMp = {
  id: string;
  nome: string;
  cnpj_cpf: string | null;
  telefone: string | null;
  email: string | null;
  cidade: string | null;
  uf: string | null;
  ativo: boolean;
};

export function useFornecedoresMp() {
  const session = useSession();
  return useQuery({
    queryKey: ["fornecedores_mp"],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("mp_fornecedores")
        .select("*")
        .eq("ativo", true)
        .order("nome");
      if (error) throw error;
      return (data ?? []) as FornecedorMp[];
    },
    staleTime: 60_000,
  });
}

export function useUpsertFornecedorMp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: Partial<FornecedorMp> & { nome: string }) => {
      const payload: any = { ...row, nome: row.nome.trim() };
      if (row.id) {
        const { data, error } = await (supabase as any).from("mp_fornecedores").update(payload).eq("id", row.id).select().single();
        if (error) throw error;
        return data;
      }
      const { data, error } = await (supabase as any).from("mp_fornecedores").insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fornecedores_mp"] });
      toast.success("Fornecedor salvo");
    },
    onError: (e: any) => toast.error(e.message ?? "Erro"),
  });
}

export function useDeleteFornecedorMp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("mp_fornecedores").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fornecedores_mp"] });
      toast.success("Removido");
    },
    onError: (e: any) => toast.error(e.message ?? "Erro"),
  });
}
