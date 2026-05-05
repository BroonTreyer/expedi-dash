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
  transportadora: string | null;
  placa: string | null;
  destino_cidade: string | null;
  destino_uf: string | null;
  peso_total: number | null;
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
export async function autoVincularCarga(notas: string[]): Promise<{ carga_id: string | null; status: "vinculado" | "pendente" | "divergente" }> {
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