import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useVendedores() {
  return useQuery({
    queryKey: ["vendedores"],
    queryFn: async () => {
      const { data, error } = await supabase.from("vendedores").select("*").order("nome_vendedor");
      if (error) throw error;
      return data;
    },
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
