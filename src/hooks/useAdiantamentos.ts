import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useAuth";
import { toast } from "sonner";
import type { CteDacteRow } from "./useCtesDacte";

export type AdiantamentoStatus = "pendente" | "pago" | "quitado" | "cancelado";

export type Adiantamento = {
  id: string;
  numero: string;
  transportadora: string;
  transportadora_id: string | null;
  tipo_agrupamento: "ordem" | "lote";
  ordem_carga: string | null;
  qtd_ctes: number;
  peso_total: number;
  valor_total_ctes: number;
  percentual: number;
  valor_adiantamento: number;
  valor_saldo: number;
  status: AdiantamentoStatus;
  pago_em: string | null;
  quitado_em: string | null;
  observacoes: string | null;
  created_at: string;
};

export type AdiantamentoCte = {
  id: string;
  adiantamento_id: string;
  cte_id: string;
  valor_frete: number;
  cte?: CteDacteRow;
};

export function useAdiantamentos(status?: AdiantamentoStatus | "todos") {
  const session = useSession();
  return useQuery({
    queryKey: ["adiantamentos_frete", status ?? "todos"],
    enabled: !!session,
    queryFn: async () => {
      let q = (supabase as any).from("adiantamentos_frete").select("*").order("created_at", { ascending: false }).limit(500);
      if (status && status !== "todos") q = q.eq("status", status);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Adiantamento[];
    },
    staleTime: 15_000,
  });
}

/** Lista os IDs de CT-es já vinculados a algum adiantamento ativo (não cancelado). */
export function useCtesEmAdiantamento() {
  const session = useSession();
  return useQuery({
    queryKey: ["adt_ctes_ativos"],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("adiantamentos_frete_ctes")
        .select("cte_id, adiantamento_id, adiantamentos_frete!inner(status, numero)")
        .neq("adiantamentos_frete.status", "cancelado")
        .limit(5000);
      if (error) throw error;
      const map = new Map<string, { adiantamento_id: string; numero: string; status: AdiantamentoStatus }>();
      for (const r of (data ?? []) as any[]) {
        map.set(r.cte_id, {
          adiantamento_id: r.adiantamento_id,
          numero: r.adiantamentos_frete.numero,
          status: r.adiantamentos_frete.status,
        });
      }
      return map;
    },
    staleTime: 15_000,
  });
}

export function useAdiantamentoCtes(adiantamento_id: string | null) {
  const session = useSession();
  return useQuery({
    queryKey: ["adt_ctes", adiantamento_id],
    enabled: !!session && !!adiantamento_id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("adiantamentos_frete_ctes")
        .select("*, ctes_dacte(*)")
        .eq("adiantamento_id", adiantamento_id);
      if (error) throw error;
      return ((data ?? []) as any[]).map((r) => ({
        id: r.id,
        adiantamento_id: r.adiantamento_id,
        cte_id: r.cte_id,
        valor_frete: Number(r.valor_frete ?? 0),
        cte: r.ctes_dacte as CteDacteRow,
      })) as AdiantamentoCte[];
    },
  });
}

export function useCriarAdiantamento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      transportadora: string;
      transportadora_id?: string | null;
      tipo_agrupamento: "ordem" | "lote";
      ordem_carga?: string | null;
      percentual: number;
      ctes: Array<{ id: string; valor_frete: number; peso_total: number }>;
      observacoes?: string | null;
      valor_adiantamento_override?: number | null;
      created_at?: string;
    }) => {
      const valor_total_ctes = input.ctes.reduce((s, c) => s + Number(c.valor_frete || 0), 0);
      const peso_total = input.ctes.reduce((s, c) => s + Number(c.peso_total || 0), 0);
      const calculado = +(valor_total_ctes * (input.percentual / 100)).toFixed(2);
      const valor_adiantamento =
        input.valor_adiantamento_override != null && input.valor_adiantamento_override >= 0
          ? +Number(input.valor_adiantamento_override).toFixed(2)
          : calculado;
      const valor_saldo = +(valor_total_ctes - valor_adiantamento).toFixed(2);

      const { data: numeroData, error: numErr } = await (supabase as any).rpc("next_adiantamento_numero");
      if (numErr) throw numErr;

      const { data: u } = await supabase.auth.getUser();
      const { data: header, error: hErr } = await (supabase as any)
        .from("adiantamentos_frete")
        .insert({
          numero: numeroData,
          transportadora: input.transportadora,
          transportadora_id: input.transportadora_id ?? null,
          tipo_agrupamento: input.tipo_agrupamento,
          ordem_carga: input.ordem_carga ?? null,
          qtd_ctes: input.ctes.length,
          peso_total,
          valor_total_ctes,
          percentual:
            valor_total_ctes > 0
              ? +((valor_adiantamento / valor_total_ctes) * 100).toFixed(2)
              : input.percentual,
          valor_adiantamento,
          valor_saldo,
          status: "pendente",
          observacoes: input.observacoes ?? null,
          created_by: u.user?.id,
          ...(input.created_at ? { created_at: input.created_at } : {}),
        })
        .select()
        .single();
      if (hErr) throw hErr;

      const rows = input.ctes.map((c) => ({
        adiantamento_id: header.id,
        cte_id: c.id,
        valor_frete: c.valor_frete,
      }));
      const { error: pErr } = await (supabase as any).from("adiantamentos_frete_ctes").insert(rows);
      if (pErr) {
        await (supabase as any).from("adiantamentos_frete").delete().eq("id", header.id);
        throw pErr;
      }
      return header as Adiantamento;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["adiantamentos_frete"] });
      qc.invalidateQueries({ queryKey: ["adt_ctes_ativos"] });
      toast.success("Adiantamento gerado");
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao gerar adiantamento"),
  });
}

export function useMarcarAdiantamentoPago() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await (supabase as any)
        .from("adiantamentos_frete")
        .update({ status: "pago", pago_em: new Date().toISOString(), pago_por: u.user?.id })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["adiantamentos_frete"] });
      toast.success("Marcado como pago");
    },
    onError: (e: any) => toast.error(e.message ?? "Erro"),
  });
}

export function useRegistrarQuitacao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { ids: string[]; observacoes?: string; quitado_em?: string }) => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await (supabase as any)
        .from("adiantamentos_frete")
        .update({
          status: "quitado",
          quitado_em: input.quitado_em ?? new Date().toISOString(),
          quitado_por: u.user?.id,
          observacoes: input.observacoes ?? null,
        })
        .in("id", input.ids);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["adiantamentos_frete"] });
      toast.success("Quitação registrada");
    },
    onError: (e: any) => toast.error(e.message ?? "Erro"),
  });
}

export function useCancelarAdiantamento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("adiantamentos_frete").update({ status: "cancelado" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["adiantamentos_frete"] });
      qc.invalidateQueries({ queryKey: ["adt_ctes_ativos"] });
      toast.success("Adiantamento cancelado");
    },
    onError: (e: any) => toast.error(e.message ?? "Erro"),
  });
}

export function useAtualizarDataAdiantamento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; created_at: string }) => {
      const { error } = await (supabase as any)
        .from("adiantamentos_frete")
        .update({ created_at: input.created_at })
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["adiantamentos_frete"] });
      toast.success("Data atualizada");
    },
    onError: (e: any) => toast.error(e.message ?? "Erro"),
  });
}