import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface RotaExecutada {
  id: string;
  carga_id: string;
  data_referencia: string;
  km_planejado: number | null;
  km_real: number | null;
  custo_planejado: number | null;
  custo_real: number | null;
  duracao_planejada_min: number | null;
  duracao_real_min: number | null;
  ordem_planejada: any;
  provider: string | null;
  tipo_caminhao: string | null;
  origem: string | null;
  criado_em: string;
  atualizado_em: string;
}

export function useRotasExecutadas(limit: number = 200) {
  const { session } = useAuth();
  return useQuery({
    queryKey: ["rotas_executadas", limit],
    queryFn: async (): Promise<RotaExecutada[]> => {
      const { data, error } = await supabase
        .from("rotas_executadas" as any)
        .select("*")
        .order("data_referencia", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as unknown as RotaExecutada[];
    },
    enabled: !!session,
    staleTime: 30_000,
  });
}

export function useUpsertRotaExecutada() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: Partial<RotaExecutada> & { carga_id: string }) => {
      const { error } = await supabase
        .from("rotas_executadas" as any)
        .upsert(row as any, { onConflict: "carga_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rotas_executadas"] });
    },
  });
}