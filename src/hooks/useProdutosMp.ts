import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useAuth";
import { toast } from "sonner";

export type ProdutoMp = {
  id: string;
  codigo: string | null;
  nome: string;
  categoria: string | null;
  unidade_padrao: string;
  preco_referencia_ton: number;
  ativo: boolean;
};

export function useProdutosMp() {
  const session = useSession();
  return useQuery({
    queryKey: ["produtos_mp"],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("mp_produtos")
        .select("*")
        .eq("ativo", true)
        .order("nome");
      if (error) throw error;
      return (data ?? []) as ProdutoMp[];
    },
    staleTime: 60_000,
  });
}

export function useUpsertProdutoMp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: Partial<ProdutoMp> & { nome: string }) => {
      const payload: any = { ...row, nome: row.nome.trim(), unidade_padrao: row.unidade_padrao ?? "ton" };
      if (row.id) {
        const { data, error } = await (supabase as any).from("mp_produtos").update(payload).eq("id", row.id).select().single();
        if (error) throw error;
        return data;
      }
      const { data, error } = await (supabase as any).from("mp_produtos").insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["produtos_mp"] });
      toast.success("Produto salvo");
    },
    onError: (e: any) => toast.error(e.message ?? "Erro"),
  });
}

export function useDeleteProdutoMp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("mp_produtos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["produtos_mp"] });
      toast.success("Removido");
    },
    onError: (e: any) => toast.error(e.message ?? "Erro"),
  });
}
