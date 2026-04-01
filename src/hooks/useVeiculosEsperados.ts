import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useSession } from "@/hooks/useAuth";
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
  const dataInicio = (() => {
    const d = new Date(dataReferencia + "T00:00:00");
    d.setDate(d.getDate() - 3);
    return d.toISOString().slice(0, 10);
  })();

  const dataLimite = (() => {
    const d = new Date(dataReferencia + "T00:00:00");
    d.setDate(d.getDate() + 3);
    return d.toISOString().slice(0, 10);
  })();

  return useQuery({
    queryKey: ["veiculos_esperados", dataInicio, dataLimite],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("veiculos_esperados" as any)
        .select("*")
        .gte("data_referencia", dataInicio)
        .lte("data_referencia", dataLimite)
        .order("data_referencia", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as VeiculoEsperado[];
    },
  });
}

function parseDataReferencia(raw: string | undefined | null, fallback: string): string {
  if (!raw || !raw.trim()) return fallback;
  const s = raw.trim();

  // yyyy-MM-dd
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  // dd/MM/yyyy
  const full = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (full) {
    const [, d, m, y] = full;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  // dd/MM (assume current year)
  const short = s.match(/^(\d{1,2})[\/\-](\d{1,2})$/);
  if (short) {
    const [, d, m] = short;
    const y = new Date().getFullYear();
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  // Excel serial number
  const num = Number(s);
  if (!isNaN(num) && num > 40000 && num < 60000) {
    const d = new Date((num - 25569) * 86400000);
    return d.toISOString().slice(0, 10);
  }

  return fallback;
}

export function useImportarVeiculosEsperados() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ rows, dataReferencia }: { rows: ParsedRow[]; dataReferencia: string }) => {
      // Collect all unique dates from rows
      const dates = new Set<string>();
      const inserts = rows.map((r) => {
        const dr = parseDataReferencia((r as any).data, dataReferencia);
        dates.add(dr);
        return {
          data_referencia: dr,
          grupo: r.grupo,
          placa: r.placa.toUpperCase().trim(),
          destino: r.destino || null,
          carga_id: r.carga_id || null,
          peso: r.peso,
          qtd_entregas: r.qtd_entregas,
          motorista: r.motorista || null,
          transportadora: r.transportadora || null,
          ajudantes: r.ajudantes || null,
          tipo_veiculo: r.tipo_veiculo || null,
          criado_por: user?.id ?? null,
        };
      });

      // Delete existing for all affected dates
      for (const dt of dates) {
        await supabase
          .from("veiculos_esperados" as any)
          .delete()
          .eq("data_referencia", dt);
      }

      const { error } = await supabase
        .from("veiculos_esperados" as any)
        .insert(inserts);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["veiculos_esperados"] });
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["veiculos_esperados"] });
    },
  });
}

export function useLimparVeiculosEsperados() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ dataInicio, dataFim }: { dataInicio: string; dataFim: string }) => {
      const { error } = await supabase
        .from("veiculos_esperados" as any)
        .delete()
        .gte("data_referencia", dataInicio)
        .lte("data_referencia", dataFim);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["veiculos_esperados"] });
      toast.success("Lista de veículos esperados limpa");
    },
    onError: () => {
      toast.error("Erro ao limpar lista");
    },
  });
}
