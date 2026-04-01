import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSession } from "@/hooks/useAuth";

export function useVendedores() {
  const session = useSession();
  return useQuery({
    queryKey: ["vendedores"],
    enabled: !!session,
    queryFn: async () => {
      let allData: any[] = [];
      let from = 0;
      const pageSize = 1000;
      while (true) {
        const { data, error } = await supabase
          .from("vendedores")
          .select("*")
          .order("nome_vendedor")
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

export function useCreateVendedor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: { codigo_vendedor: string; nome_vendedor: string; ativo: boolean }) => {
      const { data, error } = await supabase.from("vendedores").insert(values).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["vendedores"] }); toast.success("Vendedor criado"); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpdateVendedor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...values }: { id: string; codigo_vendedor: string; nome_vendedor: string; ativo: boolean }) => {
      const { data, error } = await supabase.from("vendedores").update(values).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["vendedores"] }); toast.success("Vendedor atualizado"); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeleteVendedor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("vendedores").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["vendedores"] }); toast.success("Vendedor excluído"); },
    onError: (e: any) => toast.error(e.message),
  });
}
