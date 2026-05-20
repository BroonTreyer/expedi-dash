import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useAuth";

export type ComprasProdutoRow = {
  mes: string; ano: number; mes_num: number;
  produto_id: string | null; produto_nome: string; categoria: string | null;
  ton: number; valor: number; qtd_descargas: number; qtd_fornecedores: number; preco_medio_ton: number;
};

export function useMpComprasProduto(mesISO: string, mesCompISO?: string | null) {
  const session = useSession();
  return useQuery({
    queryKey: ["mp_compras_produto", mesISO, mesCompISO ?? ""],
    enabled: !!session && !!mesISO,
    queryFn: async () => {
      const meses = [mesISO]; if (mesCompISO) meses.push(mesCompISO);
      const { data, error } = await (supabase as any)
        .from("mp_compras_mensal_produto")
        .select("*")
        .in("mes", meses);
      if (error) throw error;
      const rows = (data ?? []) as ComprasProdutoRow[];
      const atual = rows.filter((r) => r.mes === mesISO);
      const compMap = new Map<string, ComprasProdutoRow>();
      if (mesCompISO) rows.filter((r) => r.mes === mesCompISO).forEach((r) => compMap.set(r.produto_nome, r));
      const merged = atual.map((r) => {
        const c = compMap.get(r.produto_nome);
        const deltaTon = c ? ((r.ton - c.ton) / (c.ton || 1)) * 100 : null;
        const deltaValor = c ? ((r.valor - c.valor) / (c.valor || 1)) * 100 : null;
        const deltaPreco = c && c.preco_medio_ton ? ((r.preco_medio_ton - c.preco_medio_ton) / c.preco_medio_ton) * 100 : null;
        return { ...r, comparativo: c ?? null, deltaTon, deltaValor, deltaPreco };
      }).sort((a, b) => b.valor - a.valor);
      return merged;
    },
    staleTime: 60_000,
  });
}

export function useMpComprasProdutoSparkline(produtoNome: string | null, meses = 6) {
  const session = useSession();
  return useQuery({
    queryKey: ["mp_compras_produto_spark", produtoNome, meses],
    enabled: !!session && !!produtoNome,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("mp_compras_mensal_produto")
        .select("mes,ton,valor,preco_medio_ton")
        .eq("produto_nome", produtoNome)
        .order("mes", { ascending: true })
        .limit(meses);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useMpComprasProdutoDrilldown(produtoNome: string | null, mesISO: string) {
  const session = useSession();
  return useQuery({
    queryKey: ["mp_compras_produto_drill", produtoNome, mesISO],
    enabled: !!session && !!produtoNome && !!mesISO,
    queryFn: async () => {
      const inicio = mesISO.slice(0, 7) + "-01";
      const d = new Date(inicio); d.setMonth(d.getMonth() + 1);
      const fim = d.toISOString().slice(0, 10);
      const { data, error } = await (supabase as any)
        .from("mp_recebimento_itens")
        .select("id,peso_ton,valor_unitario_ton,valor_total_linha,nota_fiscal,recebimento:mp_recebimentos!inner(id,data_chegada,fornecedor_nome,placa,recibo_numero)")
        .eq("nome_produto", produtoNome)
        .gte("recebimento.data_chegada", inicio)
        .lt("recebimento.data_chegada", fim)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data ?? [];
    },
  });
}