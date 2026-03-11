import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type Carregamento = {
  id: string;
  data: string;
  vendedor_id: string | null;
  codigo_produto: string | null;
  nome_produto: string | null;
  quantidade: number | null;
  peso: number | null;
  tipo_caminhao: string | null;
  placa: string | null;
  motorista: string | null;
  cidade: string | null;
  uf: string | null;
  horario_previsto: string | null;
  horario_inicio: string | null;
  horario_fim: string | null;
  status: string;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
  vendedores?: { nome_vendedor: string } | null;
};

export function useCarregamentos(date: string) {
  return useQuery({
    queryKey: ["carregamentos", date],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("carregamentos_dia")
        .select("*, vendedores(nome_vendedor)")
        .eq("data", date)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as Carregamento[];
    },
  });
}

export function useCreateCarregamento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: Record<string, any>) => {
      const { data, error } = await supabase.from("carregamentos_dia").insert(values).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["carregamentos"] });
      toast.success("Carregamento criado");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpdateCarregamento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...values }: Record<string, any>) => {
      const { data, error } = await supabase.from("carregamentos_dia").update(values).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["carregamentos"] });
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeleteCarregamento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("carregamentos_dia").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["carregamentos"] });
      toast.success("Carregamento excluído");
    },
    onError: (e: any) => toast.error(e.message),
  });
}
