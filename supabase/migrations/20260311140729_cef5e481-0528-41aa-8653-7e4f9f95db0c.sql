
CREATE TABLE public.clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_cliente TEXT NOT NULL UNIQUE,
  nome_cliente TEXT NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow select clientes" ON public.clientes FOR SELECT TO public USING (true);
CREATE POLICY "Allow insert clientes" ON public.clientes FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow update clientes" ON public.clientes FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow delete clientes" ON public.clientes FOR DELETE TO public USING (true);

ALTER TABLE public.carregamentos_dia ADD COLUMN codigo_cliente TEXT;
