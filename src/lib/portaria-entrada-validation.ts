interface MovimentoParaEntrada {
  categoria: string;
  horario_entrada: string | null;
  horario_saida_final: string | null;
  etapa_terceirizado: string | null;
  etapa_carga_propria: string | null;
}

export function validarLiberacaoEntrada(movimento: MovimentoParaEntrada, transportadora: string | null | undefined): void {
  const categoriaCarga = transportadora?.trim() ? "terceirizado" : "carga_propria";
  if (movimento.categoria !== categoriaCarga) {
    throw new Error("A chegada e a carga estão em categorias diferentes. Peça à logística para corrigir a transportadora ou a classificação antes de liberar a entrada.");
  }
  if (movimento.horario_saida_final || movimento.etapa_terceirizado === "finalizado" || movimento.etapa_carga_propria === "finalizado") {
    throw new Error("Este movimento já foi finalizado. Atualize a lista antes de continuar.");
  }
  if (movimento.horario_entrada) {
    throw new Error("A entrada deste veículo já foi liberada. Atualize a lista para consultar o pátio.");
  }
}