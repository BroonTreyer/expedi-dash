ALTER TABLE public.carregamentos_dia DROP CONSTRAINT IF EXISTS carregamentos_dia_status_check;

ALTER TABLE public.carregamentos_dia ADD CONSTRAINT carregamentos_dia_status_check CHECK (status IN ('Aguardando', 'Separando', 'Pronto para carregar', 'Carregando', 'Carregado', 'Pendente / Problema', 'Aguardando pedido', 'Romaneio Liberado', 'Aguardando montagem de carga', 'Aguardando Produto'));