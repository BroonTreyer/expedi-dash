-- Route cache
CREATE TABLE public.route_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key text NOT NULL UNIQUE,
  origem text NOT NULL,
  destinos jsonb NOT NULL DEFAULT '[]'::jsonb,
  km_total numeric,
  duracao_min numeric,
  geometry jsonb,
  ordem_otimizada jsonb,
  provider text,
  hit_count int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_route_cache_key ON public.route_cache(cache_key);
CREATE INDEX idx_route_cache_last_used ON public.route_cache(last_used_at DESC);
ALTER TABLE public.route_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated select route_cache" ON public.route_cache
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert route_cache" ON public.route_cache
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update route_cache" ON public.route_cache
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Route templates
CREATE TABLE public.route_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  descricao text,
  origem text NOT NULL,
  paradas jsonb NOT NULL DEFAULT '[]'::jsonb,
  tipo_caminhao text,
  created_by uuid,
  times_used int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_route_templates_nome ON public.route_templates(nome);
ALTER TABLE public.route_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated select route_templates" ON public.route_templates
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Ops insert route_templates" ON public.route_templates
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'logistica'::app_role) OR has_role(auth.uid(),'faturamento'::app_role));
CREATE POLICY "Ops update route_templates" ON public.route_templates
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'logistica'::app_role) OR has_role(auth.uid(),'faturamento'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'logistica'::app_role) OR has_role(auth.uid(),'faturamento'::app_role));
CREATE POLICY "Admin delete route_templates" ON public.route_templates
  FOR DELETE TO authenticated USING (has_role(auth.uid(),'admin'::app_role));

CREATE TRIGGER trg_route_templates_updated_at
  BEFORE UPDATE ON public.route_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- App settings (k/v)
CREATE TABLE public.app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated select app_settings" ON public.app_settings
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin insert app_settings" ON public.app_settings
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Admin update app_settings" ON public.app_settings
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role));

-- Seed default fuel price
INSERT INTO public.app_settings (key, value) VALUES ('preco_combustivel', '{"valor": 6.20}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Tipos caminhão: consumo
ALTER TABLE public.tipos_caminhao ADD COLUMN IF NOT EXISTS consumo_km_litro numeric;