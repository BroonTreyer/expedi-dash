ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS tipo text NOT NULL DEFAULT 'outros';

ALTER TABLE public.clientes DROP CONSTRAINT IF EXISTS clientes_tipo_check;
ALTER TABLE public.clientes ADD CONSTRAINT clientes_tipo_check
  CHECK (tipo IN ('distribuidor','varejo','outros'));

CREATE INDEX IF NOT EXISTS idx_clientes_tipo ON public.clientes(tipo) WHERE tipo = 'distribuidor';