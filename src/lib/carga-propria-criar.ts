/**
 * Helper centralizado para criação de movimento de Carga Própria.
 *
 * Antes deste helper, 4 caminhos diferentes criavam Carga Própria com
 * shapes divergentes (entrada+chegou, saida+em_rota, etc.), causando
 * KPIs inconsistentes e estados impossíveis no banco.
 *
 * Regra única: Carga Própria SEMPRE entra como
 *   tipo_movimento = "entrada"
 *   etapa_carga_propria = "chegou"
 *   horario_chegada = horario_entrada = agora (ou data_referencia se for histórico)
 *
 * As transições posteriores (em_rota → retornou → finalizado) são UPDATEs.
 */
export interface CriarCargaPropriaInput {
  placa: string | null;
  motorista?: string | null;
  tipo_caminhao?: string | null;
  rota?: string | null;
  peso?: number | null;
  qtd_entregas?: number | null;
  carga_id?: string | null;
  empresa?: string | null;
  observacoes?: string | null;
  usuario_id?: string | null;
  /** ISO opcional — default = agora */
  horarioChegadaIso?: string;
  /** Sobrescreve horario_entrada (default = mesmo que chegada) */
  horarioEntradaIso?: string;
}

export function buildCargaPropriaPayload(input: CriarCargaPropriaInput) {
  const nowIso = input.horarioChegadaIso || new Date().toISOString();
  const entradaIso = input.horarioEntradaIso || nowIso;
  return {
    tipo_movimento: "entrada" as const,
    categoria: "carga_propria" as const,
    etapa_carga_propria: "chegou" as const,
    placa: input.placa,
    motorista: input.motorista ?? null,
    tipo_caminhao: input.tipo_caminhao ?? null,
    rota: input.rota ?? null,
    peso: input.peso ?? null,
    qtd_entregas: input.qtd_entregas ?? null,
    carga_id: input.carga_id ?? null,
    empresa: input.empresa ?? null,
    observacoes: input.observacoes ?? null,
    usuario_id: input.usuario_id ?? null,
    data_hora: nowIso,
    horario_chegada: nowIso,
    horario_entrada: entradaIso,
  };
}
