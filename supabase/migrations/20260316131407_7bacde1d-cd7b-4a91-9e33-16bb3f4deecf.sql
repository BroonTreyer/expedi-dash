
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS cidade text;
CREATE UNIQUE INDEX IF NOT EXISTS idx_clientes_codigo_cliente ON public.clientes (codigo_cliente);
