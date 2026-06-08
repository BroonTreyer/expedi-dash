import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useAuth";
import type { CteDacteRow } from "@/hooks/useCtesDacte";
import { usePesoEfetivoPorOrdem, ordemKeyOf } from "@/hooks/usePesoEfetivoPorOrdem";

export type ValorTabelaInfo = {
  valorTabela: number; // R$ total (valor_kg * peso_total)
  valorKgTabela: number;
  tipoVeiculo: "bitruck" | "carreta" | null;
  origem: "item" | "generica" | "indisponivel";
};

function normalizeCidade(s: string | null | undefined) {
  return (s ?? "").trim().toLowerCase();
}
function normalizeUF(s: string | null | undefined) {
  return (s ?? "").trim().toUpperCase();
}

/**
 * Calcula o valor de tabela do frete usando **peso efetivo da ordem** (não o
 * peso individual do CT-e, que pode vir zerado por barreira fiscal):
 * - Agrupa CT-es por `ordem_carga` (CT-es sem ordem são tratados individualmente).
 * - Usa o destino majoritário (cidade/UF) da ordem para resolver `valor_kg`.
 * - Total da ordem = `pesoEfetivo (manual | carga | cte) × valor_kg`.
 * - Distribui esse total entre os CT-es da ordem proporcionalmente ao
 *   `valor_frete` de cada um (rateio igual quando todos forem 0).
 * - Tipo de veículo é resolvido pelo cadastro do caminhão (placa → tipo_caminhao).
 */
type TabelasFreteFetch = {
  placaTipo: Map<string, "bitruck" | "carreta" | null>;
  itemMap: Map<string, { bitruck: number; carreta: number }>;
  genMap: Map<string, { bitruck?: number; carreta?: number }>;
};

function useTabelasFreteValores(placas: string[]) {
  const session = useSession();
  const placasKey = [...new Set(placas)].sort().join(",");
  return useQuery({
    queryKey: ["tabelas-frete-valores", placasKey],
    enabled: !!session,
    staleTime: 60_000,
    queryFn: async (): Promise<TabelasFreteFetch> => {
      const placaTipo = new Map<string, "bitruck" | "carreta" | null>();
      if (placas.length > 0) {
        const { data: caminhoes } = await (supabase as any)
          .from("caminhoes")
          .select("placa,tipo_caminhao")
          .in("placa", placas);
        for (const c of caminhoes ?? []) {
          const tipo = String(c.tipo_caminhao ?? "").toLowerCase();
          const norm: "bitruck" | "carreta" | null = tipo.includes("bitruck")
            ? "bitruck"
            : tipo.includes("carreta") || tipo.includes("truck") || tipo.includes("toco")
              ? "carreta"
              : null;
          placaTipo.set(String(c.placa).toUpperCase().trim(), norm);
        }
      }

      const { data: itens } = await (supabase as any)
        .from("tabelas_frete_itens")
        .select(
          "destino_cidade,destino_uf,valor_kg_bitruck,valor_kg_carreta,ativo,tabela_id,tabelas_frete!inner(ativo)",
        )
        .eq("ativo", true)
        .eq("tabelas_frete.ativo", true);
      const itemMap = new Map<string, { bitruck: number; carreta: number }>();
      for (const it of itens ?? []) {
        const k = `${normalizeCidade(it.destino_cidade)}|${normalizeUF(it.destino_uf)}`;
        if (!itemMap.has(k)) {
          itemMap.set(k, {
            bitruck: Number(it.valor_kg_bitruck || 0),
            carreta: Number(it.valor_kg_carreta || 0),
          });
        }
      }

      const { data: genericas } = await (supabase as any)
        .from("tabela_frete")
        .select("destino_cidade,destino_uf,tipo_veiculo,valor_kg,ativo")
        .eq("ativo", true);
      const genMap = new Map<string, { bitruck?: number; carreta?: number }>();
      for (const g of genericas ?? []) {
        const k = `${normalizeCidade(g.destino_cidade)}|${normalizeUF(g.destino_uf)}`;
        const cur = genMap.get(k) ?? {};
        if (g.tipo_veiculo === "bitruck") cur.bitruck = Number(g.valor_kg || 0);
        if (g.tipo_veiculo === "carreta") cur.carreta = Number(g.valor_kg || 0);
        genMap.set(k, cur);
      }

      return { placaTipo, itemMap, genMap };
    },
  });
}

function resolveValorKg(
  fetched: TabelasFreteFetch,
  destino: { cidade: string | null; uf: string | null } | null,
  tipo: "bitruck" | "carreta" | null,
): { valorKg: number; origem: ValorTabelaInfo["origem"] } {
  if (!destino) return { valorKg: 0, origem: "indisponivel" };
  const k = `${normalizeCidade(destino.cidade)}|${normalizeUF(destino.uf)}`;
  const { itemMap, genMap } = fetched;

  let valorKg = 0;
  let origem: ValorTabelaInfo["origem"] = "indisponivel";
  const item = itemMap.get(k);
  if (item && tipo) {
    valorKg = tipo === "bitruck" ? item.bitruck : item.carreta;
    if (valorKg > 0) origem = "item";
  }
  if (valorKg === 0) {
    const gen = genMap.get(k);
    if (gen && tipo) {
      valorKg = (tipo === "bitruck" ? gen.bitruck : gen.carreta) ?? 0;
      if (valorKg > 0) origem = "generica";
    }
  }
  if (valorKg === 0 && item) {
    valorKg = item.bitruck || item.carreta || 0;
    if (valorKg > 0) origem = "item";
  }
  return { valorKg, origem };
}

export function useValoresTabelaPorCte(ctes: CteDacteRow[]) {
  const placas = useMemo(
    () =>
      Array.from(
        new Set(ctes.map((c) => (c.placa ?? "").trim().toUpperCase()).filter(Boolean)),
      ),
    [ctes],
  );
  const { data: fetched } = useTabelasFreteValores(placas);
  const pesoPorOrdem = usePesoEfetivoPorOrdem(ctes);

  const data = useMemo<Map<string, ValorTabelaInfo> | undefined>(() => {
    if (!fetched) return undefined;
    const result = new Map<string, ValorTabelaInfo>();
    // Reagrupa CT-es por ordem
    const groups = new Map<string, CteDacteRow[]>();
    for (const c of ctes) {
      const k = ordemKeyOf(c);
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k)!.push(c);
    }

    for (const [k, list] of groups) {
      const info = pesoPorOrdem.get(k);
      // Tipo: usa o tipo da placa mais comum da ordem
      const placaCount = new Map<string, number>();
      for (const c of list) {
        const p = (c.placa ?? "").trim().toUpperCase();
        if (p) placaCount.set(p, (placaCount.get(p) || 0) + 1);
      }
      const placaPrincipal =
        [...placaCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
      const tipo = placaPrincipal ? fetched.placaTipo.get(placaPrincipal) ?? null : null;

      const { valorKg, origem } = resolveValorKg(fetched, info?.destino ?? null, tipo);
      const peso = info?.pesoEfetivo ?? 0;
      const totalOrdem = +(valorKg * peso).toFixed(2);

      // Rateio entre os CT-es proporcional ao valor_frete (igual se todos 0)
      const somaFrete = list.reduce((s, c) => s + Number(c.valor_frete || 0), 0);
      if (totalOrdem === 0 || list.length === 0) {
        for (const c of list) {
          result.set(c.id, {
            valorTabela: 0,
            valorKgTabela: valorKg,
            tipoVeiculo: tipo,
            origem,
          });
        }
        continue;
      }
      let acumulado = 0;
      list.forEach((c, idx) => {
        let parcela: number;
        if (idx === list.length - 1) {
          // Última recebe o resíduo para fechar centavos
          parcela = +(totalOrdem - acumulado).toFixed(2);
        } else {
          const peso =
            somaFrete > 0 ? Number(c.valor_frete || 0) / somaFrete : 1 / list.length;
          parcela = +(totalOrdem * peso).toFixed(2);
          acumulado += parcela;
        }
        result.set(c.id, {
          valorTabela: parcela,
          valorKgTabela: valorKg,
          tipoVeiculo: tipo,
          origem,
        });
      });
    }

    return result;
  }, [ctes, fetched, pesoPorOrdem]);

  return { data } as { data: Map<string, ValorTabelaInfo> | undefined };
}