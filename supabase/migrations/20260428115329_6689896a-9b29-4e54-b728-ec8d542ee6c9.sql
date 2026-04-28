-- Adiciona coluna de idempotência
ALTER TABLE public.carregamentos_dia
  ADD COLUMN IF NOT EXISTS operation_id uuid;

-- Índice único parcial: se o mesmo (operation_id, codigo_produto) chegar
-- duas vezes ao banco, o segundo INSERT é rejeitado pelo Postgres.
-- Parcial = só quando operation_id é informado, não afeta dados antigos.
CREATE UNIQUE INDEX IF NOT EXISTS carregamentos_dia_operation_unique
  ON public.carregamentos_dia (operation_id, codigo_produto)
  WHERE operation_id IS NOT NULL;

-- Index de apoio para limpeza futura / auditoria
CREATE INDEX IF NOT EXISTS carregamentos_dia_operation_id_idx
  ON public.carregamentos_dia (operation_id)
  WHERE operation_id IS NOT NULL;