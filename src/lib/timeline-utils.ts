import { formatDuracao } from "./portaria-tempos";

export type MarcoTimelineKey =
  | "registrado"
  | "pre_carga_fechada"
  | "previsao_carregar"
  | "chegada_portaria"
  | "entrada_patio"
  | "expedido";

export interface MarcoTimeline {
  key: MarcoTimelineKey;
  label: string;
  data: string | null; // ISO
  detalhe?: string | null;
}

export interface TimelineResumo {
  cicloTotalMin: number | null;
  preCargaMin: number | null;
  patioMin: number | null;
  ateExpedicaoMin: number | null;
}

function toIso(v: any): string | null {
  if (!v) return null;
  try {
    const d = new Date(v);
    return Number.isFinite(d.getTime()) ? d.toISOString() : null;
  } catch {
    return null;
  }
}

function diffMin(a: string | null, b: string | null): number | null {
  if (!a || !b) return null;
  const ta = new Date(a).getTime();
  const tb = new Date(b).getTime();
  if (!Number.isFinite(ta) || !Number.isFinite(tb)) return null;
  return Math.max(0, Math.round((tb - ta) / 60000));
}

export interface MontarTimelineInput {
  pedido: {
    created_at?: string | null;
    data?: string | null;
    carga_id?: string | null;
  };
  /** Eventos do audit_log do pedido (entity_type=carregamento), em ordem cronológica */
  auditoria?: Array<{ created_at: string; changes: any }>;
  /** Movimentações da portaria filtradas pelo carga_id */
  movimentacoes?: Array<{
    horario_chegada?: string | null;
    horario_entrada?: string | null;
    horario_real_saida?: string | null;
    horario_saida_final?: string | null;
    data_hora?: string | null;
  }>;
}

/** Monta a linha do tempo de 6 marcos para um pedido de distribuidor. */
export function montarTimelineDistribuidor(input: MontarTimelineInput): {
  marcos: MarcoTimeline[];
  resumo: TimelineResumo;
} {
  const registrado = toIso(input.pedido.created_at);

  // Primeira atribuição de carga_id no audit_log
  let preCargaFechada: string | null = null;
  for (const ev of input.auditoria ?? []) {
    const ch = ev.changes;
    if (!ch) continue;
    const cargaChange = ch.carga_id;
    if (
      cargaChange &&
      typeof cargaChange === "object" &&
      (cargaChange.de == null || cargaChange.de === "") &&
      cargaChange.para
    ) {
      preCargaFechada = toIso(ev.created_at);
      break;
    }
    // Fallback: criação já com carga_id
    if (ch.novo && ch.novo.carga_id && !preCargaFechada) {
      preCargaFechada = toIso(ev.created_at);
    }
  }
  // Se ainda não achou e o pedido tem carga_id, mostra "—"

  // Previsão = data planejada (carregamentos_dia.data)
  const previsaoCarregar = input.pedido.data
    ? toIso(`${input.pedido.data}T00:00:00`)
    : null;

  // Pega a primeira movimentação com horários (ordenada por chegada)
  const movs = (input.movimentacoes ?? [])
    .slice()
    .sort((a, b) => {
      const ka = a.horario_chegada || a.data_hora || "";
      const kb = b.horario_chegada || b.data_hora || "";
      return ka.localeCompare(kb);
    });
  const m = movs[0];

  const chegada = toIso(m?.horario_chegada);
  const entrada = toIso(m?.horario_entrada);
  const expedido =
    toIso(m?.horario_real_saida) || toIso(m?.horario_saida_final);

  const marcos: MarcoTimeline[] = [
    { key: "registrado", label: "Pedido registrado", data: registrado },
    { key: "pre_carga_fechada", label: "Pré-carga fechada", data: preCargaFechada },
    {
      key: "previsao_carregar",
      label: "Previsão de carregar",
      data: previsaoCarregar,
      detalhe: input.pedido.data ? null : "Sem data planejada",
    },
    { key: "chegada_portaria", label: "Chegada na portaria", data: chegada },
    { key: "entrada_patio", label: "Entrada no pátio", data: entrada },
    { key: "expedido", label: "Expedido", data: expedido },
  ];

  const resumo: TimelineResumo = {
    cicloTotalMin: diffMin(registrado, expedido),
    preCargaMin: diffMin(registrado, preCargaFechada),
    patioMin: diffMin(chegada, expedido),
    ateExpedicaoMin: diffMin(preCargaFechada, expedido),
  };

  return { marcos, resumo };
}

export function formatDataBrTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "—";
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function tempoRelativo(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso).getTime();
  if (!Number.isFinite(d)) return "";
  const diffMs = Date.now() - d;
  if (diffMs < 0) {
    const m = Math.round(-diffMs / 60000);
    return `em ${formatDuracao(m)}`;
  }
  const m = Math.round(diffMs / 60000);
  return `há ${formatDuracao(m)}`;
}

export { formatDuracao };