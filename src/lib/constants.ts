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

export const UF_LIST = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA',
  'PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'
];
