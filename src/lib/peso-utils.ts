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
}

export const pesoEfetivo = (c: PesoItem): number =>
  c.ruptura ? 0 : (c.peso ?? 0);

export const pesoPlanejado = (c: PesoItem): number => c.peso ?? 0;

export const somaPesoEfetivo = (arr: PesoItem[]): number =>
  arr.reduce((s, c) => s + pesoEfetivo(c), 0);

export const somaPesoPlanejado = (arr: PesoItem[]): number =>
  arr.reduce((s, c) => s + pesoPlanejado(c), 0);
