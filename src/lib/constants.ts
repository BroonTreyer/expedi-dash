export const STATUSES = [
  'Aguardando',
  'Separando',
  'Pronto para carregar',
  'Carregando',
  'Carregado',
  'Pendente / Problema',
] as const;

export type CarregamentoStatus = typeof STATUSES[number];

export const STATUS_COLORS: Record<CarregamentoStatus, string> = {
  'Aguardando': 'bg-status-aguardando text-white',
  'Separando': 'bg-status-separando text-white',
  'Pronto para carregar': 'bg-status-pronto text-white',
  'Carregando': 'bg-status-carregando text-black',
  'Carregado': 'bg-status-carregado text-white',
  'Pendente / Problema': 'bg-status-problema text-white',
};

export const RUPTURA_STATUSES = [
  'Aguardando pedido',
  'Romaneio Liberado',
  'Aguardando montagem de carga',
  'Aguardando Produto',
] as const;

export type RupturaStatus = typeof RUPTURA_STATUSES[number];

export const RUPTURA_STATUS_COLORS: Record<RupturaStatus, string> = {
  'Aguardando pedido': 'bg-status-ruptura-aguardando text-white',
  'Romaneio Liberado': 'bg-status-ruptura-liberado text-white',
  'Aguardando montagem de carga': 'bg-status-ruptura-montagem text-white',
  'Aguardando Produto': 'bg-status-ruptura-produto text-black',
};

export const UF_LIST = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA',
  'PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'
];
