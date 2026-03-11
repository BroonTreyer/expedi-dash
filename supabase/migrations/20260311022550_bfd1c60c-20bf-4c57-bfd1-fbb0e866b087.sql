
-- Create update_updated_at function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Produtos table
CREATE TABLE public.produtos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo_produto TEXT NOT NULL UNIQUE,
  nome_produto TEXT NOT NULL,
  peso_padrao NUMERIC DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow full access to produtos" ON public.produtos FOR ALL USING (true) WITH CHECK (true);

-- Vendedores table
CREATE TABLE public.vendedores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo_vendedor TEXT NOT NULL UNIQUE,
  nome_vendedor TEXT NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.vendedores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow full access to vendedores" ON public.vendedores FOR ALL USING (true) WITH CHECK (true);

-- Tipos de caminhão table
CREATE TABLE public.tipos_caminhao (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome_tipo TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.tipos_caminhao ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow full access to tipos_caminhao" ON public.tipos_caminhao FOR ALL USING (true) WITH CHECK (true);

-- Carregamentos do dia table
CREATE TABLE public.carregamentos_dia (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  vendedor_id UUID REFERENCES public.vendedores(id),
  codigo_produto TEXT,
  nome_produto TEXT,
  quantidade NUMERIC DEFAULT 0,
  peso NUMERIC DEFAULT 0,
  tipo_caminhao TEXT,
  placa TEXT,
  motorista TEXT,
  cidade TEXT,
  uf TEXT,
  horario_previsto TIME,
  horario_inicio TIMESTAMP WITH TIME ZONE,
  horario_fim TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'Aguardando' CHECK (status IN ('Aguardando', 'Separando', 'Pronto para carregar', 'Carregando', 'Carregado', 'Pendente / Problema')),
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.carregamentos_dia ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow full access to carregamentos_dia" ON public.carregamentos_dia FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER update_carregamentos_dia_updated_at
  BEFORE UPDATE ON public.carregamentos_dia
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
