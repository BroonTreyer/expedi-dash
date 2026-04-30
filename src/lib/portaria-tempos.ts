import type { MovimentacaoPortaria } from "@/hooks/useMovimentacoesPortaria";

/** Formata duração em minutos para "Xh Ymin" / "Ymin". Retorna "—" se inválido. */
export function formatDuracao(mins: number | null | undefined): string {
  if (mins == null || !Number.isFinite(mins) || mins < 0) return "—";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h > 0) return `${h}h ${m}min`;
  return `${m}min`;
}

function diffMin(a?: string | null, b?: string | null): number | null {
  if (!a || !b) return null;
  const ta = new Date(a).getTime();
  const tb = new Date(b).getTime();
  if (!Number.isFinite(ta) || !Number.isFinite(tb)) return null;
  const d = Math.round((tb - ta) / 60000);
  return d < 0 ? null : d;
}

interface TemposOperacionais {
  /** Chegada → Entrada (espera no portão) */
  espera: number | null;
  /** Entrada → Saída (operação interna) */
  operacao: number | null;
  /** Chegada → Saída (tempo total no pátio) */
  total: number | null;
}

/**
 * Calcula tempos a partir de uma entrada (m) e opcionalmente uma saída pareada (s).
 * Para Carga Própria, usa o registro principal (mesmo objeto pode conter chegada e saída_final).
 */
export function computeTempos(
  m: MovimentacaoPortaria | null | undefined,
  s?: MovimentacaoPortaria | null
): TemposOperacionais {
  if (!m) return { espera: null, operacao: null, total: null };

  const isCargaPropria = m.categoria === "carga_propria";

  const chegada = m.horario_chegada || (m.tipo_movimento === "entrada" ? null : null) || m.data_hora;
  const entrada = m.horario_entrada || (m.tipo_movimento === "entrada" ? m.data_hora : null);

  let saida: string | null | undefined = null;
  if (isCargaPropria) {
    saida = (m as any).horario_saida_final || m.horario_real_saida || null;
  } else {
    saida = s?.data_hora || (m.tipo_movimento === "saida" ? m.data_hora : null);
  }

  return {
    espera: diffMin(chegada, entrada),
    operacao: diffMin(entrada, saida),
    total: diffMin(chegada, saida),
  };
}

/** Média (em minutos) de um conjunto de números, ignorando nulos. null se vazio. */
export function media(nums: Array<number | null | undefined>): number | null {
  const valid = nums.filter((n): n is number => typeof n === "number" && Number.isFinite(n) && n >= 0);
  if (valid.length === 0) return null;
  return Math.round(valid.reduce((a, b) => a + b, 0) / valid.length);
}
