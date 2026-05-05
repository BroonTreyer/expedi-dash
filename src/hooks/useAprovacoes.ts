import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useAuth";
import { toast } from "sonner";
import { fetchAllPaginated } from "@/lib/supabase-paginate";

export function useAprovacoesPendentes() {
  const session = useSession();
  return useQuery({
    queryKey: ["aprovacoes-pendentes"],
    enabled: !!session,
    refetchInterval: 30_000,
    queryFn: async () => {
      return await fetchAllPaginated<any>((from, to) =>
        supabase
          .from("carregamentos_dia")
          .select("*, vendedores(nome_vendedor, codigo_vendedor)")
          .eq("etapa", "aguardando_faturamento")
          .order("created_at", { ascending: true })
          .order("id", { ascending: true })
          .range(from, to),
      );
    },
  });
}


export function useAprovarPedidos() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      if (ids.length === 0) return 0;
      const { error } = await supabase
        .from("carregamentos_dia")
        .update({ etapa: "vendas", status: "Aguardando" })
        .in("id", ids);
      if (error) throw error;
      return ids.length;
    },
    onSuccess: (n) => {
      toast.success(`${n} item(ns) aprovado(s) e enviados para o painel de vendas`);
      qc.invalidateQueries({ queryKey: ["aprovacoes-pendentes"] });
      qc.invalidateQueries({ queryKey: ["carregamentos"] });
      qc.invalidateQueries({ queryKey: ["meu-painel"] });
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useRejeitarPedidos() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ ids, motivo }: { ids: string[]; motivo: string }) => {
      if (ids.length === 0) return 0;
      const { error } = await supabase
        .from("carregamentos_dia")
        .update({ etapa: "rascunho", observacoes: motivo })
        .in("id", ids);
      if (error) throw error;
      return ids.length;
    },
    onSuccess: (n) => {
      toast.success(`${n} item(ns) devolvido(s) ao vendedor como rascunho`);
      qc.invalidateQueries({ queryKey: ["aprovacoes-pendentes"] });
      qc.invalidateQueries({ queryKey: ["meu-painel"] });
    },
    onError: (e: any) => toast.error(e.message),
  });
}