import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useAuth";

export type EvolucaoPrecoRow = {
  dia: string; produto_id: string | null; produto_nome: string;
  preco_medio_ton: number; preco_min_ton: number; preco_max_ton: number; ton: number; linhas: number;
};

export function useMpEvolucaoPreco(produtos: string[], diasISO: { de: string; ate: string }) {
  const session = useSession();
  return useQuery({
    queryKey: ["mp_evolucao_preco", produtos.join("|"), diasISO.de, diasISO.ate],
    enabled: !!session && produtos.length > 0,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("mp_evolucao_preco_produto")
        .select("*")
        .in("produto_nome", produtos)
        .gte("dia", diasISO.de)
        .lte("dia", diasISO.ate)
        .order("dia", { ascending: true });
      if (error) throw error;
      return (data ?? []) as EvolucaoPrecoRow[];
    },
    staleTime: 60_000,
  });
}