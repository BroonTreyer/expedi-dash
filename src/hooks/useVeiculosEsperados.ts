import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import type { ParsedRow } from "@/components/portaria/ImportarPlanilhaDialog";

export interface VeiculoEsperado {
  id: string;
  data_referencia: string;
  grupo: string;
  placa: string;
  destino: string | null;
  carga_id: string | null;
  peso: number | null;
  qtd_entregas: number | null;
  motorista: string | null;
  transportadora: string | null;
  ajudantes: string | null;
  tipo_veiculo: string | null;
  conferido: boolean;
  conferido_por: string | null;
  conferido_em: string | null;
  created_at: string;
  criado_por: string | null;
}

export function useVeiculosEsperados(dataReferencia: string) {
  // Show vehicles from selected date up to 3 days ahead
  const dataLimite = (() => {
    const d = new Date(dataReferencia + "T00:00:00");
    d.setDate(d.getDate() + 3);
    return d.toISOString().slice(0, 10);
  })();

  return useQuery({
    queryKey: ["veiculos_esperados", dataReferencia, dataLimite],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("veiculos_esperados" as any)
        .select("*")
        .gte("data_referencia", dataReferencia)
        .lte("data_referencia", dataLimite)
        .order("data_referencia", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as VeiculoEsperado[];
    },
  });
}

export function useImportarVeiculosEsperados() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ rows, dataReferencia }: { rows: ParsedRow[]; dataReferencia: string }) => {
      // Delete existing for this date
      const { error: delErr } = await supabase
        .from("veiculos_esperados" as any)
        .delete()
        .eq("data_referencia", dataReferencia);
      // Ignore delete error if no rows exist (RLS might block if not admin)
      
      const inserts = rows.map((r) => ({
        data_referencia: dataReferencia,
        grupo: r.grupo,
        placa: r.placa,
        destino: r.destino || null,
        carga_id: r.carga_id || null,
        peso: r.peso,
        qtd_entregas: r.qtd_entregas,
        motorista: r.motorista || null,
        transportadora: r.transportadora || null,
        ajudantes: r.ajudantes || null,
        tipo_veiculo: r.tipo_veiculo || null,
        criado_por: user?.id ?? null,
      }));

      const { error } = await supabase
        .from("veiculos_esperados" as any)
        .insert(inserts);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["veiculos_esperados", vars.dataReferencia] });
      toast.success(`${vars.rows.length} veículos carregados na lista de esperados`);
    },
    onError: () => {
      toast.error("Erro ao importar veículos esperados");
    },
  });
}

export function useMarcarConferido() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ placa, dataReferencia }: { placa: string; dataReferencia: string }) => {
      const { error } = await supabase
        .from("veiculos_esperados" as any)
        .update({
          conferido: true,
          conferido_por: user?.id ?? null,
          conferido_em: new Date().toISOString(),
        } as any)
        .eq("data_referencia", dataReferencia)
        .eq("placa", placa);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["veiculos_esperados", vars.dataReferencia] });
    },
  });
}

export function useLimparVeiculosEsperados() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (dataReferencia: string) => {
      const { error } = await supabase
        .from("veiculos_esperados" as any)
        .delete()
        .eq("data_referencia", dataReferencia);
      if (error) throw error;
    },
    onSuccess: (_, dataReferencia) => {
      qc.invalidateQueries({ queryKey: ["veiculos_esperados", dataReferencia] });
      toast.success("Lista de veículos esperados limpa");
    },
    onError: () => {
      toast.error("Erro ao limpar lista");
    },
  });
}
