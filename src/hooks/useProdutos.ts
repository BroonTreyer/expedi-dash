import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSession } from "@/hooks/useAuth";

export function useProdutos() {
  return useQuery({
    queryKey: ["produtos"],
    queryFn: async () => {
      let allData: any[] = [];
      let from = 0;
      const pageSize = 1000;
      while (true) {
        const { data, error } = await supabase
          .from("produtos")
          .select("*")
          .order("nome_produto")
          .range(from, from + pageSize - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        allData = allData.concat(data);
        if (data.length < pageSize) break;
        from += data.length;
      }
      return allData;
    },
    staleTime: 5 * 60 * 1000,
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
