import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useAuth";

export type GastoDetalhe = {
  carga_id: string;
  nome_carga: string | null;
  numero_cte: string;
  data_emissao: string | null;
  peso_vendedor_kg: number;
  peso_total_carga_kg: number;
  valor_frete_total: number;
  share_percent: number;
  frete_rateado: number;
  vendedores_na_carga: number;
  pedidos: Array<{ numero_pedido: number | null; cliente: string | null; peso: number }>;
};

export type GastoVendedor = {
  vendedor_id: string;
  nome_vendedor: string;
  codigo_vendedor: string;
  peso_kg: number;
  frete_rateado: number;
  ctes_count: number;
  cargas_count: number;
  detalhes: GastoDetalhe[];
};

export function useGastosVendedor(dataInicial: string, dataFinal: string) {
  const session = useSession();
  return useQuery({
    queryKey: ["gastos_vendedor", dataInicial, dataFinal],
    enabled: !!session,
    staleTime: 30_000,
    queryFn: async (): Promise<GastoVendedor[]> => {
      const { data: ctes, error: cErr } = await (supabase as any)
        .from("ctes_dacte")
        .select("id, numero_cte, valor_frete, carga_id, status, created_at, data_emissao")
        .in("status", ["vinculado", "divergente"])
        .not("carga_id", "is", null)
        .gte("created_at", `${dataInicial}T00:00:00`)
        .lte("created_at", `${dataFinal}T23:59:59`)
        .limit(5000);
      if (cErr) throw cErr;
      if (!ctes || ctes.length === 0) return [];

      const cargaIds = Array.from(new Set(ctes.map((c: any) => c.carga_id).filter(Boolean))) as string[];

      const { data: items, error: iErr } = await supabase
        .from("carregamentos_dia")
        .select("carga_id, vendedor_id, peso, numero_pedido, cliente, nome_carga")
        .in("carga_id", cargaIds);
      if (iErr) throw iErr;

      const { data: vendedores } = await supabase
        .from("vendedores")
        .select("id, codigo_vendedor, nome_vendedor");
      const vendMap = new Map<string, { nome: string; codigo: string }>(
        (vendedores ?? []).map((v: any) => [v.id, { nome: v.nome_vendedor, codigo: v.codigo_vendedor }]),
      );

      // Agrupa por carga -> vendedor
      const cargaInfo = new Map<string, {
        nome_carga: string | null;
        peso_total: number;
        porVendedor: Map<string, { peso: number; pedidos: Array<{ numero_pedido: number | null; cliente: string | null; peso: number }> }>;
      }>();

      for (const it of items ?? []) {
        const cid = (it as any).carga_id;
        const vid = (it as any).vendedor_id;
        const peso = Number((it as any).peso) || 0;
        if (!cid) continue;
        if (!cargaInfo.has(cid)) {
          cargaInfo.set(cid, { nome_carga: (it as any).nome_carga ?? null, peso_total: 0, porVendedor: new Map() });
        }
        const info = cargaInfo.get(cid)!;
        if (!info.nome_carga && (it as any).nome_carga) info.nome_carga = (it as any).nome_carga;
        info.peso_total += peso;
        if (!vid || peso <= 0) continue;
        if (!info.porVendedor.has(vid)) info.porVendedor.set(vid, { peso: 0, pedidos: [] });
        const v = info.porVendedor.get(vid)!;
        v.peso += peso;
        v.pedidos.push({
          numero_pedido: (it as any).numero_pedido ?? null,
          cliente: (it as any).cliente ?? null,
          peso,
        });
      }

      // Acumula por vendedor
      const acc = new Map<string, GastoVendedor>();
      const cargaSetByVend = new Map<string, Set<string>>();

      for (const cte of ctes) {
        const cid = (cte as any).carga_id as string;
        const valor = Number((cte as any).valor_frete) || 0;
        const info = cargaInfo.get(cid);
        if (!info || info.peso_total <= 0) continue;
        const vendCount = info.porVendedor.size;

        for (const [vid, vData] of info.porVendedor) {
          const share = vData.peso / info.peso_total;
          const rateado = share * valor;
          const meta = vendMap.get(vid);
          const cur = acc.get(vid) ?? {
            vendedor_id: vid,
            nome_vendedor: meta?.nome ?? "—",
            codigo_vendedor: meta?.codigo ?? "",
            peso_kg: 0,
            frete_rateado: 0,
            ctes_count: 0,
            cargas_count: 0,
            detalhes: [],
          };
          // Soma peso só na primeira CT-e da carga (peso é da carga, não do CT-e)
          const setCargas = cargaSetByVend.get(vid) ?? new Set<string>();
          if (!setCargas.has(cid)) {
            cur.peso_kg += vData.peso;
            setCargas.add(cid);
            cargaSetByVend.set(vid, setCargas);
          }
          cur.frete_rateado += rateado;
          cur.ctes_count += 1;
          cur.detalhes.push({
            carga_id: cid,
            nome_carga: info.nome_carga,
            numero_cte: (cte as any).numero_cte ?? "",
            data_emissao: (cte as any).data_emissao ?? null,
            peso_vendedor_kg: vData.peso,
            peso_total_carga_kg: info.peso_total,
            valor_frete_total: valor,
            share_percent: share * 100,
            frete_rateado: rateado,
            vendedores_na_carga: vendCount,
            pedidos: vData.pedidos.slice().sort((a, b) => (a.numero_pedido ?? 0) - (b.numero_pedido ?? 0)),
          });
          acc.set(vid, cur);
        }
      }

      for (const [vid, g] of acc) {
        g.cargas_count = cargaSetByVend.get(vid)?.size ?? 0;
        g.detalhes.sort((a, b) => (b.data_emissao ?? "").localeCompare(a.data_emissao ?? ""));
      }

      return Array.from(acc.values()).sort((a, b) => b.frete_rateado - a.frete_rateado);
    },
  });
}
