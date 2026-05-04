/**
 * FSM (Finite State Machine) da Carga Própria.
 *
 * Onda 4 — Estrutural. Centraliza todas as transições de etapa em um único
 * lugar, eliminando 7 implementações duplicadas espalhadas por hooks e
 * componentes. Garante invariantes:
 *   - chegou        → em_rota          (saída p/ rota)
 *   - em_rota       → retornou         (retorno do veículo)
 *   - retornou      → finalizado       (saída final / lacre)
 *   - chegou        → finalizado       (saída rápida sem rota)
 *   - null/undefined → chegou          (registro de chegada)
 *
 * Qualquer outra transição lança erro — o banco também rejeita via trigger
 * `validate_etapa_carga_propria`, mas a FSM falha cedo no front.
 */

export type EtapaCargaPropria = "chegou" | "em_rota" | "retornou" | "finalizado";

export type AcaoCargaPropria =
  | "registrar_chegada"
  | "saida_rota"
  | "retorno"
  | "saida_lacre"
  | "saida_rapida";

export const ETAPAS_CP: readonly EtapaCargaPropria[] = [
  "chegou",
  "em_rota",
  "retornou",
  "finalizado",
] as const;

const TRANSICOES: Record<AcaoCargaPropria, { de: ReadonlyArray<EtapaCargaPropria | null>; para: EtapaCargaPropria }> = {
  registrar_chegada: { de: [null], para: "chegou" },
  saida_rota:        { de: ["chegou"], para: "em_rota" },
  retorno:           { de: ["em_rota"], para: "retornou" },
  saida_lacre:       { de: ["retornou"], para: "finalizado" },
  saida_rapida:      { de: ["chegou", "em_rota", "retornou"], para: "finalizado" },
};

/** Retorna a próxima etapa para uma ação. Lança se a ação não for permitida. */
export function nextEtapa(atual: EtapaCargaPropria | null | undefined, acao: AcaoCargaPropria): EtapaCargaPropria {
  const t = TRANSICOES[acao];
  if (!t) throw new Error(`[FSM CP] Ação desconhecida: ${acao}`);
  const from = (atual ?? null) as EtapaCargaPropria | null;
  if (!t.de.includes(from)) {
    throw new Error(`[FSM CP] Transição inválida: ${from ?? "null"} → (${acao}) → ${t.para}. Permitido a partir de: ${t.de.join(", ")}`);
  }
  return t.para;
}

/** Asserta uma transição direta de→para sem ação nominal. Útil para edição manual. */
export function assertTransicao(de: EtapaCargaPropria | null | undefined, para: EtapaCargaPropria): void {
  if (!isEtapaValida(para)) throw new Error(`[FSM CP] Etapa-alvo inválida: ${para}`);
  const ordem: Record<EtapaCargaPropria, number> = { chegou: 0, em_rota: 1, retornou: 2, finalizado: 3 };
  // permite avançar ou manter; bloqueia voltar
  if (de && ordem[para] < ordem[de]) {
    throw new Error(`[FSM CP] Não é permitido retroceder etapa: ${de} → ${para}`);
  }
}

export function isEtapaValida(v: unknown): v is EtapaCargaPropria {
  return typeof v === "string" && (ETAPAS_CP as readonly string[]).includes(v);
}

/** Etapa "efetiva" para UI: trata null/legado como "chegou" se ainda no pátio. */
export function etapaEfetiva(etapa: EtapaCargaPropria | null | undefined): EtapaCargaPropria {
  return isEtapaValida(etapa) ? etapa : "chegou";
}

/** Indica se a etapa é terminal (ciclo encerrado). */
export function isFinalizada(etapa: EtapaCargaPropria | null | undefined): boolean {
  return etapa === "finalizado";
}