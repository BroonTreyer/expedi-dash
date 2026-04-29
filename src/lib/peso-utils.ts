/**
 * Peso utilities — distinguishes commercial weight (planejado) from physical weight (efetivo).
 *
 * Peso planejado = peso original do item, independente de status. É demanda comercial.
 * Peso efetivo  = peso de fato carregado no caminhão. Item em ruptura conta como 0.
 *
 * Use efetivo em: roteirização, fechamento de carga, romaneio, peso enviado pra portaria,
 * KPI "Peso Carregado", analytics de expedição.
 * Use planejado em: KPI "Peso Total" (vendas), relatórios de pedidos, performance de vendedor.
 */
export interface PesoItem {
  peso: number | null;
  ruptura: boolean;
  peso_original?: number | null;
}

export const pesoEfetivo = (c: PesoItem): number =>
  c.ruptura ? 0 : (c.peso ?? 0);

export const pesoPlanejado = (c: PesoItem): number => c.peso ?? 0;

export const somaPesoEfetivo = (arr: PesoItem[]): number =>
  arr.reduce((s, c) => s + pesoEfetivo(c), 0);

export const somaPesoPlanejado = (arr: PesoItem[]): number =>
  arr.reduce((s, c) => s + pesoPlanejado(c), 0);

/**
 * Peso que deixou de ser carregado em relação ao pedido original.
 *  - Ruptura total (ruptura = true): perda = peso_original - peso (se peso > 0,
 *    significa que parte foi entregue e só o restante é a perda real).
 *  - Ruptura parcial (peso < peso_original): retorna a diferença.
 *  - Sem perda: 0.
 */
export const pesoNaoCarregado = (c: PesoItem): number => {
  const original = c.peso_original ?? c.peso ?? 0;
  const atual = c.peso ?? 0;
  // Tanto para ruptura total quanto parcial: perda = original - atual.
  // Quando o usuário marca ruptura total mas mantém peso > 0, a perda real
  // é só a diferença (parte foi entregue). Evita superestimar o "Faltando".
  return Math.max(0, original - atual);
};

/** True quando o item não está em ruptura total mas teve peso reduzido. */
export const isRupturaParcial = (c: PesoItem): boolean => {
  if (c.ruptura) return false;
  const original = c.peso_original ?? 0;
  const atual = c.peso ?? 0;
  return original > atual && original > 0;
};
