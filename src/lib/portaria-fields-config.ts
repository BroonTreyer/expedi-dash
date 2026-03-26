export type FieldVisibility = "obrigatorio" | "opcional" | "oculto";

export type Categoria =
  | "carga_propria"
  | "terceirizado"
  | "fornecedor"
  | "visitante"
  | "prestador"
  | "outros";

export interface FieldConfig {
  key: string;
  label: string;
  placeholder?: string;
  type: "text" | "number" | "textarea" | "select" | "datetime" | "photo";
  block: "identificacao" | "veiculo" | "operacao" | "controle" | "evidencias";
  options?: { value: string; label: string }[];
}

// Visibility matrix per field per category
type VisibilityMatrix = Record<string, Record<Categoria, FieldVisibility>>;

export const CATEGORIAS_PORTARIA: { value: Categoria; label: string; icon: string; description: string }[] = [
  { value: "carga_propria", label: "Carga Própria", icon: "🚛", description: "Frota própria com controle de KM e rota" },
  { value: "terceirizado", label: "Terceirizado", icon: "🚚", description: "Transportadora terceirizada" },
  { value: "fornecedor", label: "Fornecedor", icon: "📦", description: "Entrega ou coleta de mercadoria" },
  { value: "visitante", label: "Visitante", icon: "👤", description: "Visita autorizada" },
  { value: "prestador", label: "Prestador de Serviço", icon: "🔧", description: "Manutenção, instalação, coleta" },
  { value: "outros", label: "Outros", icon: "📋", description: "Categoria controlada com justificativa" },
];

export const TIPOS_OPERACAO = [
  { value: "entrega", label: "Entrega" },
  { value: "coleta", label: "Coleta" },
  { value: "carga", label: "Carga" },
  { value: "descarga", label: "Descarga" },
  { value: "manutencao", label: "Manutenção" },
  { value: "inspecao", label: "Inspeção" },
  { value: "visita", label: "Visita" },
  { value: "outros", label: "Outros" },
];

export const FIELDS: FieldConfig[] = [
  // Bloco Identificação
  { key: "tipo_operacao", label: "Tipo de Operação", type: "select", block: "identificacao", options: TIPOS_OPERACAO },
  { key: "nome_completo", label: "Nome Completo", placeholder: "Nome da pessoa", type: "text", block: "identificacao" },
  { key: "empresa", label: "Empresa / Transportadora", placeholder: "Nome da empresa", type: "text", block: "identificacao" },
  { key: "documento", label: "Documento (CPF/RG/CNH)", placeholder: "Nº do documento", type: "text", block: "identificacao" },
  { key: "pessoa_visitada", label: "Quem vai Visitar", placeholder: "Nome do responsável", type: "text", block: "identificacao" },
  { key: "motivo_visita", label: "Motivo da Visita", placeholder: "Motivo", type: "text", block: "identificacao" },
  { key: "telefone", label: "Telefone", placeholder: "(00) 00000-0000", type: "text", block: "identificacao" },
  { key: "servico_executar", label: "Serviço a Executar", placeholder: "Descreva o serviço", type: "text", block: "identificacao" },
  { key: "descricao", label: "Descrição / Justificativa", placeholder: "Descreva o motivo do registro", type: "textarea", block: "identificacao" },

  // Bloco Veículo
  { key: "foto_placa_url", label: "📷 Foto da Placa", type: "photo", block: "veiculo" },
  { key: "placa", label: "Placa", placeholder: "ABC1D23", type: "text", block: "veiculo" },
  { key: "motorista", label: "Motorista", placeholder: "Nome do motorista", type: "text", block: "veiculo" },
  { key: "apelido", label: "Apelido do Veículo", placeholder: "Ex: Truck Azul", type: "text", block: "veiculo" },

  // Bloco Operação
  { key: "foto_painel_url", label: "📷 Foto do Painel (KM)", type: "photo", block: "operacao" },
  { key: "km_inicial", label: "KM Inicial", placeholder: "0", type: "number", block: "operacao" },
  { key: "rota", label: "Rota", placeholder: "Nome ou código da rota", type: "text", block: "operacao" },
  { key: "peso", label: "Peso (kg)", placeholder: "0", type: "number", block: "operacao" },
  { key: "qtd_entregas", label: "Qtd. de Entregas", placeholder: "0", type: "number", block: "operacao" },
  { key: "km_rota", label: "KM Rota", placeholder: "0", type: "number", block: "operacao" },
  { key: "km_final", label: "KM Final", placeholder: "0", type: "number", block: "operacao" },
  { key: "tipo_carga", label: "Tipo de Carga", placeholder: "Ex: Frio, Seco...", type: "text", block: "operacao" },
  { key: "nota_fiscal", label: "Nota Fiscal / Documento", placeholder: "Nº da NF", type: "text", block: "operacao" },
  { key: "doca_setor", label: "Doca / Setor Destino", placeholder: "Ex: Doca 3", type: "text", block: "operacao" },
  { key: "carga_id", label: "Ordem de Carga", placeholder: "Nº da ordem", type: "text", block: "operacao" },
  { key: "numero_lacre", label: "N° Lacre", placeholder: "Nº do lacre", type: "text", block: "operacao" },

  // Bloco Controle
  { key: "responsavel_interno", label: "Responsável Interno", placeholder: "Nome do responsável", type: "text", block: "controle" },
  { key: "conferente", label: "Conferente", placeholder: "Nome do conferente", type: "text", block: "controle" },
  { key: "ocorrencia", label: "Ocorrência", placeholder: "Descreva a ocorrência", type: "textarea", block: "controle" },
  { key: "observacoes", label: "Observações", placeholder: "Observações adicionais...", type: "textarea", block: "controle" },

  // Bloco Evidências
  { key: "foto_documento_url", label: "📷 Foto de Documento", type: "photo", block: "evidencias" },
  { key: "foto_nota_url", label: "📷 Foto da Nota Fiscal", type: "photo", block: "evidencias" },
];

export const VISIBILITY: VisibilityMatrix = {
  // Identificação
  tipo_operacao:      { carga_propria: "oculto",      terceirizado: "obrigatorio", fornecedor: "opcional",    visitante: "oculto",      prestador: "oculto",      outros: "oculto" },
  nome_completo:      { carga_propria: "oculto",      terceirizado: "oculto",      fornecedor: "oculto",      visitante: "obrigatorio", prestador: "obrigatorio", outros: "obrigatorio" },
  empresa:            { carga_propria: "oculto",      terceirizado: "obrigatorio", fornecedor: "obrigatorio", visitante: "opcional",    prestador: "obrigatorio", outros: "opcional" },
  documento:          { carga_propria: "oculto",      terceirizado: "obrigatorio", fornecedor: "obrigatorio", visitante: "obrigatorio", prestador: "obrigatorio", outros: "obrigatorio" },
  pessoa_visitada:    { carga_propria: "oculto",      terceirizado: "oculto",      fornecedor: "oculto",      visitante: "obrigatorio", prestador: "oculto",      outros: "oculto" },
  motivo_visita:      { carga_propria: "oculto",      terceirizado: "oculto",      fornecedor: "oculto",      visitante: "obrigatorio", prestador: "oculto",      outros: "oculto" },
  telefone:           { carga_propria: "oculto",      terceirizado: "oculto",      fornecedor: "oculto",      visitante: "opcional",    prestador: "oculto",      outros: "oculto" },
  servico_executar:   { carga_propria: "oculto",      terceirizado: "oculto",      fornecedor: "oculto",      visitante: "oculto",      prestador: "obrigatorio", outros: "oculto" },
  descricao:          { carga_propria: "oculto",      terceirizado: "oculto",      fornecedor: "oculto",      visitante: "oculto",      prestador: "oculto",      outros: "obrigatorio" },

  // Veículo
  placa:              { carga_propria: "obrigatorio", terceirizado: "obrigatorio", fornecedor: "obrigatorio", visitante: "opcional",    prestador: "obrigatorio", outros: "opcional" },
  motorista:          { carga_propria: "obrigatorio", terceirizado: "obrigatorio", fornecedor: "obrigatorio", visitante: "oculto",      prestador: "oculto",      outros: "oculto" },
  apelido:            { carga_propria: "oculto",      terceirizado: "oculto",      fornecedor: "oculto",      visitante: "oculto",      prestador: "oculto",      outros: "oculto" },

  // Operação
  rota:               { carga_propria: "obrigatorio", terceirizado: "oculto",      fornecedor: "oculto",      visitante: "oculto",      prestador: "oculto",      outros: "oculto" },
  peso:               { carga_propria: "oculto",      terceirizado: "oculto",      fornecedor: "oculto",      visitante: "oculto",      prestador: "oculto",      outros: "oculto" },
  qtd_entregas:       { carga_propria: "oculto",      terceirizado: "oculto",      fornecedor: "oculto",      visitante: "oculto",      prestador: "oculto",      outros: "oculto" },
  km_rota:            { carga_propria: "oculto",      terceirizado: "oculto",      fornecedor: "oculto",      visitante: "oculto",      prestador: "oculto",      outros: "oculto" },
  km_inicial:         { carga_propria: "obrigatorio", terceirizado: "oculto",      fornecedor: "oculto",      visitante: "oculto",      prestador: "oculto",      outros: "oculto" },
  km_final:           { carga_propria: "oculto",      terceirizado: "oculto",      fornecedor: "oculto",      visitante: "oculto",      prestador: "oculto",      outros: "oculto" },
  tipo_carga:         { carga_propria: "oculto",      terceirizado: "oculto",      fornecedor: "obrigatorio", visitante: "oculto",      prestador: "oculto",      outros: "oculto" },
  nota_fiscal:        { carga_propria: "oculto",      terceirizado: "opcional",    fornecedor: "obrigatorio", visitante: "oculto",      prestador: "oculto",      outros: "oculto" },
  doca_setor:         { carga_propria: "oculto",      terceirizado: "oculto",      fornecedor: "opcional",    visitante: "oculto",      prestador: "oculto",      outros: "oculto" },
  carga_id:           { carga_propria: "opcional",    terceirizado: "opcional",    fornecedor: "opcional",    visitante: "oculto",      prestador: "oculto",      outros: "oculto" },
  numero_lacre:       { carga_propria: "oculto",      terceirizado: "oculto",      fornecedor: "oculto",      visitante: "oculto",      prestador: "oculto",      outros: "oculto" },

  // Controle
  responsavel_interno:{ carga_propria: "oculto",      terceirizado: "opcional",    fornecedor: "oculto",      visitante: "oculto",      prestador: "obrigatorio", outros: "oculto" },
  conferente:         { carga_propria: "oculto",      terceirizado: "oculto",      fornecedor: "oculto",      visitante: "oculto",      prestador: "oculto",      outros: "oculto" },
  ocorrencia:         { carga_propria: "oculto",      terceirizado: "oculto",      fornecedor: "oculto",      visitante: "oculto",      prestador: "oculto",      outros: "oculto" },
  observacoes:        { carga_propria: "oculto",      terceirizado: "opcional",    fornecedor: "opcional",    visitante: "opcional",    prestador: "opcional",    outros: "obrigatorio" },

  // Evidências
  foto_placa_url:     { carga_propria: "obrigatorio", terceirizado: "obrigatorio", fornecedor: "obrigatorio", visitante: "oculto",      prestador: "obrigatorio", outros: "obrigatorio" },
  foto_documento_url: { carga_propria: "oculto",      terceirizado: "obrigatorio", fornecedor: "obrigatorio", visitante: "obrigatorio", prestador: "obrigatorio", outros: "obrigatorio" },
  foto_painel_url:    { carga_propria: "obrigatorio", terceirizado: "oculto",      fornecedor: "oculto",      visitante: "oculto",      prestador: "oculto",      outros: "oculto" },
  foto_nota_url:      { carga_propria: "oculto",      terceirizado: "oculto",      fornecedor: "obrigatorio", visitante: "oculto",      prestador: "oculto",      outros: "oculto" },
};

// Exit visibility — only carga_propria has fields; others use quick exit
export const VISIBILITY_SAIDA: VisibilityMatrix = {
  // Only show foto_painel + km_final + observacoes for carga_propria exit
  tipo_operacao:      { carga_propria: "oculto",      terceirizado: "oculto", fornecedor: "oculto", visitante: "oculto", prestador: "oculto", outros: "oculto" },
  nome_completo:      { carga_propria: "oculto",      terceirizado: "oculto", fornecedor: "oculto", visitante: "oculto", prestador: "oculto", outros: "oculto" },
  empresa:            { carga_propria: "oculto",      terceirizado: "oculto", fornecedor: "oculto", visitante: "oculto", prestador: "oculto", outros: "oculto" },
  documento:          { carga_propria: "oculto",      terceirizado: "oculto", fornecedor: "oculto", visitante: "oculto", prestador: "oculto", outros: "oculto" },
  pessoa_visitada:    { carga_propria: "oculto",      terceirizado: "oculto", fornecedor: "oculto", visitante: "oculto", prestador: "oculto", outros: "oculto" },
  motivo_visita:      { carga_propria: "oculto",      terceirizado: "oculto", fornecedor: "oculto", visitante: "oculto", prestador: "oculto", outros: "oculto" },
  telefone:           { carga_propria: "oculto",      terceirizado: "oculto", fornecedor: "oculto", visitante: "oculto", prestador: "oculto", outros: "oculto" },
  servico_executar:   { carga_propria: "oculto",      terceirizado: "oculto", fornecedor: "oculto", visitante: "oculto", prestador: "oculto", outros: "oculto" },
  descricao:          { carga_propria: "oculto",      terceirizado: "oculto", fornecedor: "oculto", visitante: "oculto", prestador: "oculto", outros: "oculto" },
  placa:              { carga_propria: "oculto",      terceirizado: "oculto", fornecedor: "oculto", visitante: "oculto", prestador: "oculto", outros: "oculto" },
  motorista:          { carga_propria: "oculto",      terceirizado: "oculto", fornecedor: "oculto", visitante: "oculto", prestador: "oculto", outros: "oculto" },
  apelido:            { carga_propria: "oculto",      terceirizado: "oculto", fornecedor: "oculto", visitante: "oculto", prestador: "oculto", outros: "oculto" },
  rota:               { carga_propria: "oculto",      terceirizado: "oculto", fornecedor: "oculto", visitante: "oculto", prestador: "oculto", outros: "oculto" },
  peso:               { carga_propria: "oculto",      terceirizado: "oculto", fornecedor: "oculto", visitante: "oculto", prestador: "oculto", outros: "oculto" },
  qtd_entregas:       { carga_propria: "oculto",      terceirizado: "oculto", fornecedor: "oculto", visitante: "oculto", prestador: "oculto", outros: "oculto" },
  km_rota:            { carga_propria: "oculto",      terceirizado: "oculto", fornecedor: "oculto", visitante: "oculto", prestador: "oculto", outros: "oculto" },
  km_inicial:         { carga_propria: "oculto",      terceirizado: "oculto", fornecedor: "oculto", visitante: "oculto", prestador: "oculto", outros: "oculto" },
  km_final:           { carga_propria: "obrigatorio", terceirizado: "oculto", fornecedor: "oculto", visitante: "oculto", prestador: "oculto", outros: "oculto" },
  tipo_carga:         { carga_propria: "oculto",      terceirizado: "oculto", fornecedor: "oculto", visitante: "oculto", prestador: "oculto", outros: "oculto" },
  nota_fiscal:        { carga_propria: "oculto",      terceirizado: "oculto", fornecedor: "oculto", visitante: "oculto", prestador: "oculto", outros: "oculto" },
  doca_setor:         { carga_propria: "oculto",      terceirizado: "oculto", fornecedor: "oculto", visitante: "oculto", prestador: "oculto", outros: "oculto" },
  carga_id:           { carga_propria: "oculto",      terceirizado: "oculto", fornecedor: "oculto", visitante: "oculto", prestador: "oculto", outros: "oculto" },
  numero_lacre:       { carga_propria: "oculto",      terceirizado: "oculto", fornecedor: "oculto", visitante: "oculto", prestador: "oculto", outros: "oculto" },
  responsavel_interno:{ carga_propria: "oculto",      terceirizado: "oculto", fornecedor: "oculto", visitante: "oculto", prestador: "oculto", outros: "oculto" },
  conferente:         { carga_propria: "oculto",      terceirizado: "oculto", fornecedor: "oculto", visitante: "oculto", prestador: "oculto", outros: "oculto" },
  ocorrencia:         { carga_propria: "oculto",      terceirizado: "oculto", fornecedor: "oculto", visitante: "oculto", prestador: "oculto", outros: "oculto" },
  observacoes:        { carga_propria: "opcional",    terceirizado: "oculto", fornecedor: "oculto", visitante: "oculto", prestador: "oculto", outros: "oculto" },
  foto_placa_url:     { carga_propria: "oculto",      terceirizado: "oculto", fornecedor: "oculto", visitante: "oculto", prestador: "oculto", outros: "oculto" },
  foto_documento_url: { carga_propria: "oculto",      terceirizado: "oculto", fornecedor: "oculto", visitante: "oculto", prestador: "oculto", outros: "oculto" },
  foto_painel_url:    { carga_propria: "obrigatorio", terceirizado: "oculto", fornecedor: "oculto", visitante: "oculto", prestador: "oculto", outros: "oculto" },
  foto_nota_url:      { carga_propria: "oculto",      terceirizado: "oculto", fornecedor: "oculto", visitante: "oculto", prestador: "oculto", outros: "oculto" },
};

export const BLOCKS = [
  { key: "identificacao", label: "Identificação", icon: "🏷️" },
  { key: "veiculo", label: "Veículo", icon: "🚗" },
  { key: "operacao", label: "Operação", icon: "📊" },
  { key: "controle", label: "Controle de Acesso", icon: "🔐" },
  { key: "evidencias", label: "Evidências", icon: "📸" },
] as const;

export function getVisibleFields(categoria: Categoria, tipoMovimento: "entrada" | "saida" = "entrada") {
  const matrix = tipoMovimento === "saida" ? VISIBILITY_SAIDA : VISIBILITY;
  return FIELDS.filter((f) => {
    const vis = matrix[f.key]?.[categoria];
    return vis && vis !== "oculto";
  }).map((f) => ({
    ...f,
    required: matrix[f.key][categoria] === "obrigatorio",
  }));
}

export function getVisibleBlocks(categoria: Categoria, tipoMovimento: "entrada" | "saida" = "entrada") {
  const visibleFields = getVisibleFields(categoria, tipoMovimento);
  return BLOCKS.filter((block) => visibleFields.some((f) => f.block === block.key));
}

export function getBlockFields(categoria: Categoria, blockKey: string, tipoMovimento: "entrada" | "saida" = "entrada") {
  return getVisibleFields(categoria, tipoMovimento).filter((f) => f.block === blockKey);
}

export function validateForm(categoria: Categoria, values: Record<string, any>, tipoMovimento: "entrada" | "saida" = "entrada"): boolean {
  const requiredFields = getVisibleFields(categoria, tipoMovimento).filter((f) => f.required);
  return requiredFields.every((f) => {
    const val = values[f.key];
    if (f.type === "number") return val !== null && val !== undefined && val !== "";
    if (f.type === "photo") return !!val;
    return typeof val === "string" && val.trim().length > 0;
  });
}

/** Check if a category needs the full exit dialog (with fields) or just quick exit */
export function needsExitDialog(categoria: Categoria): boolean {
  return getVisibleFields(categoria, "saida").length > 0;
}
