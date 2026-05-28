ALTER TABLE public.carregamentos_dia
ADD COLUMN IF NOT EXISTS data_prevista_carregamento date;

COMMENT ON COLUMN public.carregamentos_dia.data_prevista_carregamento
IS 'Data prevista de carregamento informada pelo Faturamento na tela de Pré-cargas. Puramente informativa — não é usada em filtros, queries ou cálculos.';