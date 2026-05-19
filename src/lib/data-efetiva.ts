import { format } from "date-fns";

function toLocalDate(iso: string): string {
  try {
    return format(new Date(iso), "yyyy-MM-dd");
  } catch {
    return iso.slice(0, 10);
  }
}

/**
 * Calcula a "data efetiva" de uma carga TERCEIRIZADA, ou seja, o dia em
 * que ela realmente saiu / foi finalizada — não o dia em que foi cadastrada.
 *
 * Regra:
 *  1. Se houver `horario_saida_final` registrado pela portaria → usa essa
 *     data. **Fixa** — a carga deixa de "viajar" entre os dias.
 *  2. Senão (ainda no pátio / aguardando) → usa `today` (HOJE). Assim a
 *     carga aparece sempre no Consolidado do dia atual enquanto não for
 *     expedida, em vez de sumir no dia planejado original.
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
  today?: string,
): string {
  const isTerc = items.some((i) => !!i.transportadora);
  if (!isTerc) return dataOriginal;

  if (saidaPortariaIso) {
    return toLocalDate(saidaPortariaIso);
  }

  // Sem saída registrada → carga está "viva" hoje. Mantém visível no
  // Consolidado do dia atual até a portaria registrar a saída.
  return today ?? new Date().toISOString().slice(0, 10);
}
