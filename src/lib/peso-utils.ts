/**
 * Peso utilities — distinguishes commercial weight (planejado) from physical weight (efetivo).
 *
 * Peso efetivo = peso de fato carregado no caminhão. Item em ruptura conta como 0.
 *
 * Use efetivo em: roteirização, fechamento de carga, romaneio, peso enviado pra portaria,
 * KPI "Peso Carregado", analytics de expedição.
 */
interface PesoItem {
  peso: number | null;
  ruptura: boolean;
  peso_original?: number | null;
}

interface QtdItem {
  quantidade: number | null;
  ruptura: boolean;
  quantidade_original?: number | null;
}

export const pesoEfetivo = (c: PesoItem): number =>
  c.ruptura ? 0 : (c.peso ?? 0);

/**
 * Peso que deixou de ser carregado em relação ao pedido original.
 *  - Ruptura total (ruptura = true): perda = peso_original (item inteiro perdido).
 *    No fluxo do sistema, peso/quantidade ficam com o valor original como referência
 *    do que foi pedido; o flag `ruptura` indica que nada foi carregado.
 *  - Ruptura parcial (peso < peso_original): retorna a diferença.
 *  - Sem perda: 0.
 */
export const pesoNaoCarregado = (c: PesoItem): number => {
  const original = c.peso_original ?? c.peso ?? 0;
  if (c.ruptura) return original;
  const atual = c.peso ?? 0;
  return Math.max(0, original - atual);
};

/** True quando o item não está em ruptura total mas teve peso reduzido. */
export const isRupturaParcial = (c: PesoItem): boolean => {
  if (c.ruptura) return false;
  const original = c.peso_original ?? 0;
  const atual = c.peso ?? 0;
  return original > atual && original > 0;
};

/**
 * Quantidade que deixou de ser carregada — espelha `pesoNaoCarregado` para unidades.
 * Ruptura total: devolve `quantidade_original`. Parcial: `original - atual`. Sem perda: 0.
 */
export const quantidadeNaoCarregada = (c: QtdItem): number => {
  const original = c.quantidade_original ?? c.quantidade ?? 0;
  if (c.ruptura) return original;
  const atual = c.quantidade ?? 0;
  return Math.max(0, original - atual);
};
