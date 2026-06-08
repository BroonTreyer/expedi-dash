import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useAuth";
import { pesoEfetivo } from "@/lib/peso-utils";
import { fetchAllPaginated } from "@/lib/supabase-paginate";

/**
 * Para uma lista de carga_ids, retorna Map<carga_id, peso_efetivo_total> usando
 * `carregamentos_dia`. Para tratar reuso de carga_id em datas diferentes
 * (ex.: "JR MIX"), usa apenas a data mais recente presente nos registros.
 */
export function usePesoCargaPorIds(cargaIds: string[]) {
  const session = useSession();
  const ids = Array.from(new Set((cargaIds ?? []).filter(Boolean))).sort();
  const key = ids.join(",");

  return useQuery({
    queryKey: ["peso_carga_por_ids", key],
    enabled: !!session && ids.length > 0,
    staleTime: 30_000,
    queryFn: async () => {
      const rows = await fetchAllPaginated<any>((from, to) =>
        (supabase as any)
          .from("carregamentos_dia")
          .select("carga_id, data, peso, ruptura")
          .in("carga_id", ids)
          .order("data", { ascending: false })
          .range(from, to),
      );
      // carga_id -> data -> sum(peso_efetivo)
      const byCarga = new Map<string, Map<string, number>>();
      for (const r of (rows ?? []) as any[]) {
        const cid = r.carga_id as string | null;
        const d = r.data as string | null;
        if (!cid || !d) continue;
        const m = byCarga.get(cid) ?? new Map<string, number>();
        m.set(
          d,
          (m.get(d) || 0) +
            pesoEfetivo({ peso: Number(r.peso) || 0, ruptura: !!r.ruptura }),
        );
        byCarga.set(cid, m);
      }
      const out = new Map<string, number>();
      for (const [cid, m] of byCarga) {
        const datas = [...m.keys()].sort();
        const latest = datas[datas.length - 1];
        if (latest) out.set(cid, m.get(latest) || 0);
      }
      return out;
    },
  });
}