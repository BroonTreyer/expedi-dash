import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useSession } from "@/hooks/useAuth";
import { toast } from "sonner";
import type { ParsedRow } from "@/components/portaria/ImportarPlanilhaDialog";

export type StatusAutorizacao = "previsto" | "aguardando_vinculo" | "aguardando_autorizacao" | "autorizado" | "recusado";

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
  walk_in: boolean;
  status_autorizacao: StatusAutorizacao;
  autorizado_por: string | null;
  autorizado_em: string | null;
  motivo_recusa: string | null;
  observacoes: string | null;
}

export function useSolicitacoesPendentes() {
  const session = useSession();
  return useQuery({
    queryKey: ["veiculos_esperados_pendentes"],
    enabled: !!session,
    refetchInterval: 15000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("veiculos_esperados" as any)
        .select("*")
        .in("status_autorizacao", ["aguardando_vinculo", "aguardando_autorizacao"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as VeiculoEsperado[];
    },
  });
}

/**
 * Walk-ins ainda em circulação na página Registro de Entrada:
 * - aguardando_vinculo: Logística ainda não fechou carga
 * - autorizado: Logística vinculou e liberou — aguardando porteiro registrar chegada
 * Sempre filtrado por conferido=false (depois que porteiro registra chegada, sai da lista).
 */
export function useVeiculosWalkInAtivos() {
  const session = useSession();
  return useQuery({
    queryKey: ["veiculos_walkin_ativos"],
    enabled: !!session,
    refetchInterval: 15000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("veiculos_esperados" as any)
        .select("*")
        .eq("walk_in", true)
        .eq("conferido", false)
        .in("status_autorizacao", ["aguardando_vinculo", "autorizado"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as VeiculoEsperado[];
    },
  });
}

/**
 * Porteiro confirma a chegada física do veículo walk-in já liberado.
 * Cria a movimentação de entrada e marca veiculo_esperado como conferido.
 */
export function useRegistrarChegadaPortaria() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (v: VeiculoEsperado) => {
      const isCargaPropria = (v.grupo || "").toUpperCase().includes("PROPRIA") || (v.grupo || "").toUpperCase().includes("PRÓPRIA");
      const categoria = isCargaPropria ? "carga_propria" : "terceirizado";
      const nowIso = new Date().toISOString();

      const movPayload: Record<string, any> = {
        tipo_movimento: "entrada",
        categoria,
        placa: v.placa,
        motorista: v.motorista,
        tipo_caminhao: v.tipo_veiculo,
        carga_id: v.carga_id,
        peso: v.peso,
        qtd_entregas: v.qtd_entregas,
        horario_entrada: nowIso,
        horario_chegada: v.created_at,
        data_hora: nowIso,
        usuario_id: user?.id ?? null,
        observacoes: v.observacoes,
      };
      if (categoria === "terceirizado") {
        movPayload.empresa = v.transportadora;
        movPayload.etapa_terceirizado = "no_patio";
      } else {
        movPayload.etapa_carga_propria = "chegou";
      }

      const { error: movErr } = await supabase
        .from("movimentacoes_portaria")
        .insert(movPayload as any);
      if (movErr) throw movErr;

      const { error: updErr } = await supabase
        .from("veiculos_esperados" as any)
        .update({
          conferido: true,
          conferido_por: user?.id ?? null,
          conferido_em: nowIso,
        } as any)
        .eq("id", v.id);
      if (updErr) throw updErr;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["veiculos_walkin_ativos"] });
      qc.invalidateQueries({ queryKey: ["veiculos_esperados_pendentes"] });
      qc.invalidateQueries({ queryKey: ["veiculos_esperados"] });
      qc.invalidateQueries({ queryKey: ["movimentacoes_portaria"] });
      toast.success("Entrada liberada — veículo no pátio");
    },
    onError: (e: any) => toast.error(e.message || "Erro ao registrar chegada"),
  });
}

export function useRegistrarChegadaWalkIn() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      placa: string;
      motorista?: string;
      transportadora?: string;
      tipo_veiculo?: string;
      destino?: string;
      observacoes?: string;
      grupo?: string;
    }) => {
      const today = new Date().toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from("veiculos_esperados" as any)
        .insert({
          data_referencia: today,
          grupo: input.grupo || "WALK-IN",
          placa: input.placa.toUpperCase().trim(),
          motorista: input.motorista || null,
          transportadora: input.transportadora || null,
          tipo_veiculo: input.tipo_veiculo || null,
          destino: input.destino || null,
          observacoes: input.observacoes || null,
          walk_in: true,
          status_autorizacao: "aguardando_vinculo",
          criado_por: user?.id ?? null,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["veiculos_esperados"] });
      qc.invalidateQueries({ queryKey: ["veiculos_esperados_pendentes"] });
      qc.invalidateQueries({ queryKey: ["veiculos_aguardando_vinculo"] });
      toast.success("Entrada registrada — aguardando vínculo de carga pela Logística");
    },
    onError: (e: any) => toast.error(e.message || "Erro ao registrar entrada"),
  });
}

export function useVeiculosAguardandoVinculo() {
  const session = useSession();
  return useQuery({
    queryKey: ["veiculos_aguardando_vinculo"],
    enabled: !!session,
    refetchInterval: 15000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("veiculos_esperados" as any)
        .select("*")
        .eq("walk_in", true)
        .eq("status_autorizacao", "aguardando_vinculo")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as VeiculoEsperado[];
    },
  });
}

export function useAutorizarChegada() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ id, autorizar, motivo }: { id: string; autorizar: boolean; motivo?: string }) => {
      const { error } = await supabase
        .from("veiculos_esperados" as any)
        .update({
          status_autorizacao: autorizar ? "autorizado" : "recusado",
          autorizado_por: user?.id ?? null,
          autorizado_em: new Date().toISOString(),
          motivo_recusa: autorizar ? null : (motivo || null),
        } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["veiculos_esperados"] });
      qc.invalidateQueries({ queryKey: ["veiculos_esperados_pendentes"] });
      toast.success(vars.autorizar ? "Entrada autorizada" : "Entrada recusada");
    },
    onError: (e: any) => toast.error(e.message || "Erro ao processar autorização"),
  });
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

  const session = useSession();

  return useQuery({
    queryKey: ["veiculos_esperados", dataInicio, dataLimite],
    enabled: !!session,
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

export function useDeleteVeiculosEsperados() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from("veiculos_esperados" as any)
        .delete()
        .in("id", ids);
      if (error) throw error;
    },
    onSuccess: (_, ids) => {
      qc.invalidateQueries({ queryKey: ["veiculos_esperados"] });
      toast.success(`${ids.length} veículo(s) excluído(s)`);
    },
    onError: () => {
      toast.error("Erro ao excluir veículos selecionados");
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
