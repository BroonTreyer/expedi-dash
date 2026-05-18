import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useAuth";
import type { CteDacteRow } from "@/hooks/useCtesDacte";

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
 * Para cada CT-e, busca o valor de tabela aplicável.
 * - Tipo de veículo é resolvido pelo cadastro do caminhão (placa → tipo_caminhao).
 * - Busca primeiro em `tabelas_frete_itens` (por destino, tabela ativa), fallback em `tabela_frete`.
 */
export function useValoresTabelaPorCte(ctes: CteDacteRow[]) {
  const session = useSession();
  const placas = Array.from(
    new Set(ctes.map((c) => (c.placa ?? "").trim().toUpperCase()).filter(Boolean)),
  );
  const destinosKey = Array.from(
    new Set(
      ctes
        .filter((c) => c.destino_cidade && c.destino_uf)
        .map((c) => `${normalizeCidade(c.destino_cidade)}|${normalizeUF(c.destino_uf)}`),
    ),
  ).join(",");

  return useQuery({
    queryKey: ["valores-tabela-cte", placas.join(","), destinosKey],
    enabled: !!session && ctes.length > 0,
    staleTime: 60_000,
    queryFn: async (): Promise<Map<string, ValorTabelaInfo>> => {
      const result = new Map<string, ValorTabelaInfo>();
      if (ctes.length === 0) return result;

      // 1) Tipo de veículo por placa
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

      // 2) Itens de tabela ativos (apenas tabelas ativas)
      const { data: itens } = await (supabase as any)
        .from("tabelas_frete_itens")
        .select("destino_cidade,destino_uf,valor_kg_bitruck,valor_kg_carreta,ativo,tabela_id,tabelas_frete!inner(ativo)")
        .eq("ativo", true)
        .eq("tabelas_frete.ativo", true);
      const itemMap = new Map<
        string,
        { bitruck: number; carreta: number }
      >();
      for (const it of itens ?? []) {
        const k = `${normalizeCidade(it.destino_cidade)}|${normalizeUF(it.destino_uf)}`;
        // Mantém o primeiro encontrado (suficiente para comparativo)
        if (!itemMap.has(k)) {
          itemMap.set(k, {
            bitruck: Number(it.valor_kg_bitruck || 0),
            carreta: Number(it.valor_kg_carreta || 0),
          });
        }
      }

      // 3) Fallback: tabela_frete genérica
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

      // 4) Resolve para cada CT-e
      for (const c of ctes) {
        const placa = (c.placa ?? "").toUpperCase().trim();
        const tipo = placa ? placaTipo.get(placa) ?? null : null;
        const peso = Number(c.peso_total ?? 0);
        const k = `${normalizeCidade(c.destino_cidade)}|${normalizeUF(c.destino_uf)}`;

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
        // Última tentativa: se não temos tipo, pega bitruck do item como referência
        if (valorKg === 0 && item) {
          valorKg = item.bitruck || item.carreta || 0;
          if (valorKg > 0) origem = "item";
        }

        result.set(c.id, {
          valorTabela: +(valorKg * peso).toFixed(2),
          valorKgTabela: valorKg,
          tipoVeiculo: tipo,
          origem,
        });
      }

      return result;
    },
  });
}