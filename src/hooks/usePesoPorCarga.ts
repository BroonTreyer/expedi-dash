import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useAuth";
import { pesoEfetivo } from "@/lib/peso-utils";
import { fetchAllPaginated } from "@/lib/supabase-paginate";

/**
 * Retorna um Map<`${carga_id}::${data}`, peso_efetivo_total> agregado de
 * carregamentos_dia para os pares (carga_id, data) fornecidos.
 *
 * IMPORTANTE: filtra por data porque o mesmo `carga_id` (ex.: "JR MIX") pode
 * ser reaproveitado em dias diferentes. Sem o filtro, o peso era inflado
 * somando o histórico inteiro.
 *
 * Usa pesoEfetivo (rupturas = 0) para alinhar com o restante do sistema.
 */
export function usePesoPorCarga(refs: { carga_id: string; data: string }[]) {
  const session = useSession();
  const pairs = Array.from(
    new Set(
      (refs ?? [])
        .filter((r) => r && r.carga_id && r.data)
        .map((r) => `${r.carga_id}::${r.data}`)
    )
  ).sort();
  const ids = Array.from(new Set(pairs.map((p) => p.split("::")[0])));
  const datas = Array.from(new Set(pairs.map((p) => p.split("::")[1])));
  const key = pairs.join("|");

  return useQuery({
    queryKey: ["peso_por_carga", key],
    enabled: !!session && pairs.length > 0,
    staleTime: 30_000,
    queryFn: async () => {
      const data = await fetchAllPaginated<any>((from, to) =>
        (supabase as any)
          .from("carregamentos_dia")
          .select("carga_id, data, peso, ruptura, id")
          .in("carga_id", ids)
          .in("data", datas)
          .order("id", { ascending: true })
          .range(from, to),
      );
      const map = new Map<string, number>();
      const allowed = new Set(pairs);
      for (const row of (data ?? []) as any[]) {
        const cid = row.carga_id as string;
        const d = row.data as string;
        if (!cid || !d) continue;
        const k = `${cid}::${d}`;
        if (!allowed.has(k)) continue; // descarta combinações cruzadas
        map.set(k, (map.get(k) || 0) + pesoEfetivo({
          peso: Number(row.peso) || 0,
          ruptura: !!row.ruptura,
        }));
      }
      return map;
    },
  });
}
