import { useMemo } from "react";
import type { CteDacteRow } from "@/hooks/useCtesDacte";
import { usePesoCargaPorIds } from "@/hooks/usePesoCargaPorIds";

export type FontePeso = "manual" | "carga" | "cte";

export type PesoOrdemInfo = {
  pesoEfetivo: number;
  fonte: FontePeso;
  destino: { cidade: string | null; uf: string | null } | null;
  cteIds: string[];
  /** Chave estável da ordem (= ordem_carga ou `__id__:<cte_id>` se sem ordem). */
  ordemKey: string;
};

export function ordemKeyOf(c: { id: string; ordem_carga: string | null }): string {
  const oc = (c.ordem_carga ?? "").trim();
  return oc ? `oc:${oc}` : `id:${c.id}`;
}

/**
 * Calcula o peso efetivo de cada ordem de carga:
 * 1) Se algum CT-e da ordem tiver `peso_carga_manual > 0` → usa esse valor (manual).
 * 2) Senão, soma o peso efetivo dos pedidos em `carregamentos_dia` para os
 *    `carga_id` referenciados (carga, descarta CT-es com peso 0 da barreira).
 * 3) Fallback: soma o `peso_total` dos próprios CT-es.
 *
 * Também devolve o destino majoritário da ordem (cidade/UF), usado pelo
 * cálculo do valor de tabela.
 */
export function usePesoEfetivoPorOrdem(ctes: CteDacteRow[]) {
  const cargaIds = useMemo(
    () => Array.from(new Set(ctes.map((c) => c.carga_id).filter(Boolean) as string[])),
    [ctes],
  );
  const { data: pesoCargaMap } = usePesoCargaPorIds(cargaIds);

  return useMemo(() => {
    const map = new Map<string, PesoOrdemInfo>();
    const groups = new Map<string, CteDacteRow[]>();
    for (const c of ctes) {
      const k = ordemKeyOf(c);
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k)!.push(c);
    }

    for (const [k, list] of groups) {
      // Destino majoritário (por peso_total; desempate por número de CT-es)
      const destAcc = new Map<
        string,
        { cidade: string | null; uf: string | null; peso: number; count: number }
      >();
      for (const c of list) {
        const dk = `${(c.destino_cidade ?? "").trim().toLowerCase()}|${(c.destino_uf ?? "").trim().toUpperCase()}`;
        const prev =
          destAcc.get(dk) ?? { cidade: c.destino_cidade, uf: c.destino_uf, peso: 0, count: 0 };
        prev.peso += Number(c.peso_total || 0);
        prev.count += 1;
        destAcc.set(dk, prev);
      }
      const dests = [...destAcc.values()].sort(
        (a, b) => b.peso - a.peso || b.count - a.count,
      );
      const destino = dests[0] ? { cidade: dests[0].cidade, uf: dests[0].uf } : null;
      const cteIds = list.map((c) => c.id);

      // 1) Override manual (qualquer CT-e da ordem)
      const manual = list.find(
        (c) => Number((c as any).peso_carga_manual || 0) > 0,
      ) as any;
      if (manual) {
        map.set(k, {
          ordemKey: k,
          pesoEfetivo: Number(manual.peso_carga_manual || 0),
          fonte: "manual",
          destino,
          cteIds,
        });
        continue;
      }

      // 2) Peso da carga (carregamentos_dia)
      const cargas = Array.from(
        new Set(list.map((c) => c.carga_id).filter(Boolean) as string[]),
      );
      let pesoCarga = 0;
      for (const cid of cargas) pesoCarga += pesoCargaMap?.get(cid) ?? 0;
      if (pesoCarga > 0) {
        map.set(k, { ordemKey: k, pesoEfetivo: pesoCarga, fonte: "carga", destino, cteIds });
        continue;
      }

      // 3) Fallback: peso somado dos CT-es
      const pesoCte = list.reduce((s, c) => s + Number(c.peso_total || 0), 0);
      map.set(k, { ordemKey: k, pesoEfetivo: pesoCte, fonte: "cte", destino, cteIds });
    }

    return map;
  }, [ctes, pesoCargaMap]);
}