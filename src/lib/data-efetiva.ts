/**
 * Calcula a "data efetiva" de uma carga TERCEIRIZADA, ou seja, o dia em
 * que ela realmente saiu / foi finalizada — não o dia em que foi cadastrada.
 *
 * Regra:
 *  1. Se houver `horario_saida_final` registrado pela portaria → usa essa data.
 *  2. Senão, se TODOS os itens estão com status "Carregado" → usa a maior
 *     `updated_at` entre os itens (dia em que foi finalizado no faturamento).
 *  3. Senão → mantém a data original (`dataOriginal`).
 *
 * Cargas próprias (sem `transportadora`) sempre retornam a data original —
 * a regra só vale para terceirizadas.
 */
export interface ItemParaDataEfetiva {
  status: string | null | undefined;
  updated_at?: string | null;
  transportadora?: string | null;
}

export function computeDataEfetivaTerceirizada(
  items: ItemParaDataEfetiva[],
  dataOriginal: string,
  saidaPortariaIso: string | null | undefined,
): string {
  const isTerc = items.some((i) => !!i.transportadora);
  if (!isTerc) return dataOriginal;

  if (saidaPortariaIso) {
    try {
      return saidaPortariaIso.slice(0, 10); // YYYY-MM-DD em TZ local sem conversão
    } catch {
      // fallback abaixo
    }
  }

  const todosCarregado =
    items.length > 0 && items.every((i) => i.status === "Carregado");
  if (todosCarregado) {
    let maxUpd: string | null = null;
    for (const i of items) {
      if (i.updated_at && (!maxUpd || i.updated_at > maxUpd)) maxUpd = i.updated_at;
    }
    if (maxUpd) return maxUpd.slice(0, 10);
  }

  return dataOriginal;
}
