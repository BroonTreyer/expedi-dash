
-- Create registros_portaria table
CREATE TABLE public.registros_portaria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  carga_id text NOT NULL,
  tipo_registro text NOT NULL CHECK (tipo_registro IN ('saida', 'retorno')),
  placa_prevista text,
  foto_placa_url text,
  texto_placa_lido text,
  confianca_placa numeric,
  foto_km_url text,
  km_lido numeric,
  confianca_km numeric,
  km_confirmado numeric,
  placa_confirmada text,
  km_rodado_real numeric,
  divergencia_placa boolean DEFAULT false,
  divergencia_km boolean DEFAULT false,
  status_validacao text NOT NULL DEFAULT 'pendente' CHECK (status_validacao IN ('confirmada', 'parcial', 'divergente', 'corrigida', 'imagem_invalida', 'pendente')),
  leitura_modo text DEFAULT 'automatica' CHECK (leitura_modo IN ('automatica', 'manual')),
  usuario_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.registros_portaria ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Authenticated select registros_portaria" ON public.registros_portaria FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert registros_portaria" ON public.registros_portaria FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update registros_portaria" ON public.registros_portaria FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('portaria', 'portaria', true);

-- Storage policies for authenticated uploads
CREATE POLICY "Authenticated upload portaria" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'portaria');
CREATE POLICY "Public read portaria" ON storage.objects FOR SELECT TO public USING (bucket_id = 'portaria');
