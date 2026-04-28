-- 1) Chave única por linha para idempotência segura, mesmo se um pedido tiver
--    legitimamente vários itens do mesmo produto (a chave inclui o índice da linha).
ALTER TABLE public.carregamentos_dia
  ADD COLUMN IF NOT EXISTS row_op_key text;

CREATE UNIQUE INDEX IF NOT EXISTS carregamentos_dia_row_op_key_unique
  ON public.carregamentos_dia (row_op_key)
  WHERE row_op_key IS NOT NULL;

-- 2) Índice para consultas por numero_pedido + data (cascata de irmãos)
CREATE INDEX IF NOT EXISTS idx_carregamentos_data_numero_pedido
  ON public.carregamentos_dia (data, numero_pedido)
  WHERE numero_pedido IS NOT NULL;