import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSession } from "@/hooks/useAuth";

export function useTiposCaminhao() {
  const session = useSession();
  return useQuery({
    queryKey: ["tipos_caminhao"],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await supabase.from("tipos_caminhao").select("*").order("nome_tipo");
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateTipoCaminhao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: { nome_tipo: string }) => {
      const { data, error } = await supabase.from("tipos_caminhao").insert(values).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tipos_caminhao"] }); toast.success("Tipo criado"); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeleteTipoCaminhao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tipos_caminhao").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tipos_caminhao"] }); toast.success("Tipo excluído"); },
    onError: (e: any) => toast.error(e.message),
  });
}
