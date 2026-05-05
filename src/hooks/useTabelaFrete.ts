import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useAuth";
import { toast } from "sonner";

export type TabelaFreteRow = {
  id: string;
  destino_cidade: string;
  destino_uf: string;
  tipo_veiculo: "bitruck" | "carreta";
  valor_kg: number;
  ativo: boolean;
};

export function useTabelaFrete() {
  const session = useSession();
  return useQuery({
    queryKey: ["tabela_frete"],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tabela_frete" as any)
        .select("*")
        .order("destino_uf")
        .order("destino_cidade");
      if (error) throw error;
      return (data ?? []) as unknown as TabelaFreteRow[];
    },
    staleTime: 60_000,
  });
}

export function useUpsertTabelaFrete() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: Partial<TabelaFreteRow> & { destino_cidade: string; destino_uf: string; tipo_veiculo: "bitruck" | "carreta"; valor_kg: number }) => {
      const { data, error } = await (supabase as any)
        .from("tabela_frete")
        .upsert(
          {
            destino_cidade: row.destino_cidade.trim(),
            destino_uf: row.destino_uf.trim().toUpperCase().slice(0, 2),
            tipo_veiculo: row.tipo_veiculo,
            valor_kg: Number(row.valor_kg) || 0,
            ativo: row.ativo ?? true,
          },
          { onConflict: "destino_cidade,destino_uf,tipo_veiculo" },
        )
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tabela_frete"] }),
    onError: (e: any) => toast.error(e.message ?? "Erro ao salvar"),
  });
}

export function useDeleteTabelaFrete() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("tabela_frete").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tabela_frete"] });
      toast.success("Tarifa removida");
    },
    onError: (e: any) => toast.error(e.message ?? "Erro"),
  });
}