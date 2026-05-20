import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useAuth";
import type { RecebimentoMp } from "@/hooks/useRecebimentosMp";

export type HistoricoFiltros = {
  de?: string;
  ate?: string;
  fornecedorId?: string | null;
  motorista?: string;
  placa?: string;
  status?: string;
};

export function useRecebimentosMpHistorico(f: HistoricoFiltros) {
  const session = useSession();
  return useQuery({
    queryKey: ["recebimentos_mp_historico", f],
    enabled: !!session,
    queryFn: async () => {
      let q = (supabase as any)
        .from("mp_recebimentos")
        .select("*")
        .order("data_chegada", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(2000);
      if (f.de) q = q.gte("data_chegada", f.de);
      if (f.ate) q = q.lte("data_chegada", f.ate);
      if (f.fornecedorId) q = q.eq("fornecedor_id", f.fornecedorId);
      if (f.status && f.status !== "todos") q = q.eq("status_geral", f.status);
      if (f.motorista) q = q.ilike("motorista", `%${f.motorista}%`);
      if (f.placa) q = q.ilike("placa", `%${f.placa.toUpperCase()}%`);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as RecebimentoMp[];
    },
    staleTime: 30_000,
  });
}