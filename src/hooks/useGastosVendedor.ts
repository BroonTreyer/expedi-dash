import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useAuth";

export type GastoVendedor = {
  vendedor_id: string;
  nome_vendedor: string;
  codigo_vendedor: string;
  peso_kg: number;
  frete_rateado: number;
  ctes_count: number;
};

/**
 * Rateio: para cada CT-e vinculado a uma carga, soma o peso por vendedor da carga
 * e distribui valor_frete proporcionalmente.
 */
export function useGastosVendedor(dataInicial: string, dataFinal: string) {
  const session = useSession();
  return useQuery({
    queryKey: ["gastos_vendedor", dataInicial, dataFinal],
    enabled: !!session,
    staleTime: 30_000,
    queryFn: async (): Promise<GastoVendedor[]> => {
      // 1) CT-es vinculados no período
      const { data: ctes, error: cErr } = await (supabase as any)
        .from("ctes_dacte")
        .select("id, valor_frete, carga_id, status, created_at, data_emissao")
        .in("status", ["vinculado", "divergente"])
        .not("carga_id", "is", null)
        .gte("created_at", `${dataInicial}T00:00:00`)
        .lte("created_at", `${dataFinal}T23:59:59`)
        .limit(5000);
      if (cErr) throw cErr;
      if (!ctes || ctes.length === 0) return [];

      const cargaIds = Array.from(new Set(ctes.map((c: any) => c.carga_id).filter(Boolean))) as string[];

      // 2) Itens das cargas
      const { data: items, error: iErr } = await supabase
        .from("carregamentos_dia")
        .select("carga_id, vendedor_id, peso")
        .in("carga_id", cargaIds);
      if (iErr) throw iErr;

      // 3) Vendedores (para nome/código)
      const { data: vendedores } = await supabase
        .from("vendedores")
        .select("id, codigo_vendedor, nome_vendedor");
      const vendMap = new Map<string, { nome: string; codigo: string }>(
        (vendedores ?? []).map((v: any) => [v.id, { nome: v.nome_vendedor, codigo: v.codigo_vendedor }]),
      );

      // 4) Agrupa peso por (carga_id, vendedor_id)
      const pesoCargaVend = new Map<string, Map<string, number>>();
      const pesoCargaTotal = new Map<string, number>();
      for (const it of items ?? []) {
        const cid = (it as any).carga_id;
        const vid = (it as any).vendedor_id;
        const peso = Number((it as any).peso) || 0;
        if (!cid || !vid || peso <= 0) continue;
        if (!pesoCargaVend.has(cid)) pesoCargaVend.set(cid, new Map());
        const m = pesoCargaVend.get(cid)!;
        m.set(vid, (m.get(vid) ?? 0) + peso);
        pesoCargaTotal.set(cid, (pesoCargaTotal.get(cid) ?? 0) + peso);
      }

      // 5) Rateia frete de cada CT-e
      const acc = new Map<string, GastoVendedor>();
      for (const cte of ctes) {
        const cid = (cte as any).carga_id as string;
        const valor = Number((cte as any).valor_frete) || 0;
        const total = pesoCargaTotal.get(cid) ?? 0;
        if (total <= 0) continue;
        const m = pesoCargaVend.get(cid);
        if (!m) continue;
        for (const [vid, peso] of m) {
          const share = (peso / total) * valor;
          const meta = vendMap.get(vid);
          const cur = acc.get(vid) ?? {
            vendedor_id: vid,
            nome_vendedor: meta?.nome ?? "—",
            codigo_vendedor: meta?.codigo ?? "",
            peso_kg: 0,
            frete_rateado: 0,
            ctes_count: 0,
          };
          cur.peso_kg += peso;
          cur.frete_rateado += share;
          cur.ctes_count += 1;
          acc.set(vid, cur);
        }
      }

      return Array.from(acc.values()).sort((a, b) => b.frete_rateado - a.frete_rateado);
    },
  });
}