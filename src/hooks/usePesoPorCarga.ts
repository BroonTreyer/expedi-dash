import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useAuth";

/**
 * Retorna um Map<carga_id, peso_total> agregado de carregamentos_dia
 * para os carga_ids fornecidos. Usado para enriquecer cards (Expedição etc.)
 * onde a movimentação não traz peso, mas a carga sim.
 */
export function usePesoPorCarga(cargaIds: string[]) {
  const session = useSession();
  const ids = Array.from(new Set(cargaIds.filter(Boolean))).sort();
  const key = ids.join("|");

  return useQuery({
    queryKey: ["peso_por_carga", key],
    enabled: !!session && ids.length > 0,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("carregamentos_dia" as any)
        .select("carga_id, peso")
        .in("carga_id", ids);
      if (error) throw error;
      const map = new Map<string, number>();
      for (const row of (data ?? []) as any[]) {
        const cid = row.carga_id as string;
        if (!cid) continue;
        map.set(cid, (map.get(cid) || 0) + (Number(row.peso) || 0));
      }
      return map;
    },
  });
}
