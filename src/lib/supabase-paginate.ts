import { supabase } from "@/integrations/supabase/client";

/**
 * Pagina automaticamente uma consulta do PostgREST até esgotar todas as
 * linhas. O PostgREST aplica um teto de 1.000 linhas por requisição, então
 * sem paginação várias telas (Gastos por Vendedor, Analytics, Relatórios,
 * Consolidado etc.) acabavam mostrando totais truncados — por exemplo, um
 * pedido com 4 linhas somando 29.000 kg aparecia como 9.000 kg porque parte
 * caía fora da primeira página.
 *
 * Uso:
 *   const rows = await fetchAllPaginated((from, to) =>
 *     supabase.from("carregamentos_dia")
 *       .select("*")
 *       .gte("data", di).lte("data", df)
 *       .order("data", { ascending: true })
 *       .order("id", { ascending: true })   // <- chave única ao final
 *       .range(from, to),
 *   );
 *
 * IMPORTANTE: a query passada DEVE incluir uma ordenação determinística
 * terminando em uma coluna única (ex.: `id`). Sem isso, o PostgREST pode
 * repetir/pular linhas entre páginas quando há empate na ordenação.
 */
export async function fetchAllPaginated<T>(
  build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: any }>,
  pageSize = 1000,
): Promise<T[]> {
  const out: T[] = [];
  let from = 0;
  // Limite de segurança para nunca entrar em loop infinito (200k linhas).
  for (let i = 0; i < 200; i++) {
    const { data, error } = await build(from, from + pageSize - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    out.push(...data);
    if (data.length < pageSize) break;
    from += data.length;
  }
  return out;
}

// Re-export para conveniência caso o caller queira usar o cliente direto.
export { supabase };