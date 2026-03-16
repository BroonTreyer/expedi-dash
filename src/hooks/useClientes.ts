import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useClientes() {
  return useQuery({
    queryKey: ["clientes"],
    queryFn: async () => {
      let allData: any[] = [];
      let from = 0;
      const pageSize = 1000;
      while (true) {
        const { data, error } = await supabase
          .from("clientes")
          .select("*")
          .order("nome_cliente")
          .range(from, from + pageSize - 1);
        if (error) throw error;
        allData = allData.concat(data);
        if (data.length < pageSize) break;
        from += pageSize;
      }
      return allData;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateCliente() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: { codigo_cliente: string; nome_cliente: string; cidade?: string; uf?: string; ativo: boolean }) => {
      const { data, error } = await supabase.from("clientes").insert(values).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["clientes"] }); toast.success("Cliente criado"); },
    onError: (e: any) => {
      if (e.message?.includes("duplicate") || e.message?.includes("unique")) {
        toast.error("Já existe um cliente com este código.");
      } else {
        toast.error(e.message);
      }
    },
  });
}

export function useUpdateCliente() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...values }: { id: string; codigo_cliente: string; nome_cliente: string; cidade?: string; uf?: string; ativo: boolean }) => {
      const { data, error } = await supabase.from("clientes").update(values).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["clientes"] }); toast.success("Cliente atualizado"); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeleteCliente() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("clientes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["clientes"] }); toast.success("Cliente excluído"); },
    onError: (e: any) => toast.error(e.message),
  });
}
