-- Adiciona campos de preço aos pedidos (opcionais)
ALTER TABLE public.carregamentos_dia
  ADD COLUMN IF NOT EXISTS preco_unitario numeric,
  ADD COLUMN IF NOT EXISTS preco_total numeric;
