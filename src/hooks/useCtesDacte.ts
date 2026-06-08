import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useAuth";
import { toast } from "sonner";

export type CteDacteRow = {
  id: string;
  numero_cte: string;
  serie: string | null;
  valor_frete: number;
  carga_id: string | null;
  ordem_carga: string | null;
  transportadora: string | null;
  placa: string | null;
  destino_cidade: string | null;
  destino_uf: string | null;
  peso_total: number | null;
  /**
   * Override manual do peso da carga (por ordem). Quando preenchido em
   * qualquer CT-e da mesma `ordem_carga`, todos os cálculos de frete passam a
   * usar esse valor (útil quando o CT-e foi emitido com peso 0 na barreira).
   */
  peso_carga_manual: number | null;
  notas_fiscais: string[];
  pdf_url: string | null;
  raw_extracao: any;
  status: "pendente" | "vinculado" | "divergente";
  data_emissao: string | null;
  created_at: string;
};

export function useCtesDacte() {
  const session = useSession();
  return useQuery({
    queryKey: ["ctes_dacte"],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("ctes_dacte")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(2000);
      if (error) throw error;
      return (data ?? []) as CteDacteRow[];
    },
    staleTime: 30_000,
  });
}

/** Tenta encontrar carga_id buscando carregamentos cujos numero_pedido estejam nas NFs. */
export async function autoVincularCarga(notas: string[], ordemCarga?: string | null): Promise<{ carga_id: string | null; status: "vinculado" | "pendente" | "divergente" }> {
  // 1) Tenta por Ordem de Carga (mais confiável)
  const oc = (ordemCarga ?? "").trim();
  if (oc) {
    const { data: byOc } = await (supabase as any)
      .from("carregamentos_dia")
      .select("carga_id")
      .eq("ordem_carga", oc)
      .not("carga_id", "is", null)
      .limit(500);
    const distintos = Array.from(new Set((byOc ?? []).map((r: any) => r.carga_id).filter(Boolean)));
    if (distintos.length === 1) return { carga_id: distintos[0] as string, status: "vinculado" };
    if (distintos.length > 1) return { carga_id: distintos[0] as string, status: "divergente" };
  }

  const nums = notas
    .map((n) => parseInt(String(n).replace(/\D/g, ""), 10))
    .filter((n) => Number.isFinite(n));
  if (nums.length === 0) return { carga_id: null, status: "pendente" };

  const { data, error } = await supabase
    .from("carregamentos_dia")
    .select("carga_id")
    .in("numero_pedido", nums)
    .not("carga_id", "is", null)
    .limit(500);

  if (error || !data) return { carga_id: null, status: "pendente" };

  const distintos = Array.from(new Set(data.map((r: any) => r.carga_id).filter(Boolean)));
  if (distintos.length === 1) return { carga_id: distintos[0], status: "vinculado" };
  if (distintos.length === 0) return { carga_id: null, status: "pendente" };
  return { carga_id: distintos[0], status: "divergente" };
}

/** Busca cargas disponíveis pelo número da Ordem de Carga (autocomplete). */
export type CargaPorOrdemRow = {
  carga_id: string;
  ordem_carga: string;
  nome_carga: string | null;
  placa: string | null;
  transportadora: string | null;
  motorista: string | null;
  data: string;
};
export async function buscarCargasPorOrdem(termo: string): Promise<CargaPorOrdemRow[]> {
  const q = termo.trim();
  if (!q) return [];
  const { data, error } = await (supabase as any)
    .from("carregamentos_dia")
    .select("carga_id, ordem_carga, nome_carga, placa, transportadora, motorista, data")
    .ilike("ordem_carga", `%${q}%`)
    .not("carga_id", "is", null)
    .order("data", { ascending: false })
    .limit(200);
  if (error || !data) return [];
  const seen = new Set<string>();
  const out: CargaPorOrdemRow[] = [];
  for (const r of data as any[]) {
    if (!r.carga_id || seen.has(r.carga_id)) continue;
    seen.add(r.carga_id);
    out.push(r as CargaPorOrdemRow);
  }
  return out;
}

export function useInsertCteDacte() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: Partial<CteDacteRow>) => {
      const { data: u } = await supabase.auth.getUser();
      const { data, error } = await (supabase as any)
        .from("ctes_dacte")
        .insert({ ...row, created_by: u.user?.id })
        .select()
        .single();
      if (error) throw error;
      return data as CteDacteRow;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ctes_dacte"] }),
    onError: (e: any) => toast.error(e.message ?? "Erro ao salvar CT-e"),
  });
}

export function useUpdateCteDacte() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: { id: string } & Partial<CteDacteRow>) => {
      const { data, error } = await (supabase as any).from("ctes_dacte").update(patch).eq("id", id).select().single();
      if (error) throw error;
      return data as CteDacteRow;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ctes_dacte"] }),
    onError: (e: any) => toast.error(e.message ?? "Erro"),
  });
}

export function useDeleteCteDacte() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("ctes_dacte").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ctes_dacte"] });
      toast.success("CT-e removido");
    },
    onError: (e: any) => toast.error(e.message ?? "Erro"),
  });
}

export function useDeleteCtesByIds() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      if (ids.length === 0) return 0;
      const { error } = await (supabase as any).from("ctes_dacte").delete().in("id", ids);
      if (error) throw error;
      return ids.length;
    },
    onSuccess: (n) => {
      qc.invalidateQueries({ queryKey: ["ctes_dacte"] });
      toast.success(`${n} CT-e(s) removido(s)`);
    },
    onError: (e: any) => toast.error(e.message ?? "Erro"),
  });
}

/**
 * Define (ou limpa) o peso manual da carga para todos os CT-es de uma mesma
 * ordem de carga. Passe `peso = null` para limpar e voltar ao peso automático.
 */
export function useSetPesoCargaManualByOrdem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ ordem_carga, peso }: { ordem_carga: string; peso: number | null }) => {
      const oc = (ordem_carga ?? "").trim();
      if (!oc) throw new Error("Ordem de carga vazia");
      const { error } = await (supabase as any)
        .from("ctes_dacte")
        .update({ peso_carga_manual: peso })
        .eq("ordem_carga", oc);
      if (error) throw error;
      return { ordem_carga: oc, peso };
    },
    onSuccess: ({ peso }) => {
      qc.invalidateQueries({ queryKey: ["ctes_dacte"] });
      toast.success(peso == null ? "Peso manual removido" : "Peso da carga atualizado");
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao salvar peso"),
  });
}