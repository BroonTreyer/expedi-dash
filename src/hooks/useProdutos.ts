import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useProdutos() {
  return useQuery({
    queryKey: ["produtos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("produtos").select("*").order("nome_produto");
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateProduto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: { codigo_produto: string; nome_produto: string; peso_padrao: number; ativo: boolean }) => {
      const { data, error } = await supabase.from("produtos").insert(values).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["produtos"] }); toast.success("Produto criado"); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpdateProduto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...values }: { id: string; codigo_produto: string; nome_produto: string; peso_padrao: number; ativo: boolean }) => {
      const { data, error } = await supabase.from("produtos").update(values).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["produtos"] }); toast.success("Produto atualizado"); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeleteProduto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("produtos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["produtos"] }); toast.success("Produto excluído"); },
    onError: (e: any) => toast.error(e.message),
  });
}
