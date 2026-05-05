
-- ===== tabela_frete =====
CREATE TABLE public.tabela_frete (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  destino_cidade text NOT NULL,
  destino_uf text NOT NULL,
  tipo_veiculo text NOT NULL CHECK (tipo_veiculo IN ('bitruck','carreta')),
  valor_kg numeric NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (destino_cidade, destino_uf, tipo_veiculo)
);

CREATE INDEX idx_tabela_frete_destino ON public.tabela_frete (destino_cidade, destino_uf);

ALTER TABLE public.tabela_frete ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/log select tabela_frete" ON public.tabela_frete
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'logistica'::app_role));
CREATE POLICY "Admin/log insert tabela_frete" ON public.tabela_frete
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'logistica'::app_role));
CREATE POLICY "Admin/log update tabela_frete" ON public.tabela_frete
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'logistica'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'logistica'::app_role));
CREATE POLICY "Admin/log delete tabela_frete" ON public.tabela_frete
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'logistica'::app_role));

CREATE TRIGGER trg_tabela_frete_updated_at
  BEFORE UPDATE ON public.tabela_frete
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===== ctes_dacte =====
CREATE TABLE public.ctes_dacte (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  numero_cte text NOT NULL,
  serie text,
  valor_frete numeric NOT NULL DEFAULT 0,
  carga_id text,
  transportadora text,
  placa text,
  destino_cidade text,
  destino_uf text,
  peso_total numeric,
  notas_fiscais jsonb NOT NULL DEFAULT '[]'::jsonb,
  pdf_url text,
  raw_extracao jsonb,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','vinculado','divergente')),
  data_emissao date,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ctes_dacte_numero ON public.ctes_dacte (numero_cte);
CREATE INDEX idx_ctes_dacte_carga ON public.ctes_dacte (carga_id);
CREATE INDEX idx_ctes_dacte_data ON public.ctes_dacte (data_emissao DESC);

ALTER TABLE public.ctes_dacte ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/log select ctes_dacte" ON public.ctes_dacte
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'logistica'::app_role));
CREATE POLICY "Admin/log insert ctes_dacte" ON public.ctes_dacte
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'logistica'::app_role));
CREATE POLICY "Admin/log update ctes_dacte" ON public.ctes_dacte
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'logistica'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'logistica'::app_role));
CREATE POLICY "Admin/log delete ctes_dacte" ON public.ctes_dacte
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'logistica'::app_role));

CREATE TRIGGER trg_ctes_dacte_updated_at
  BEFORE UPDATE ON public.ctes_dacte
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===== Storage bucket =====
INSERT INTO storage.buckets (id, name, public) VALUES ('dacte','dacte', false)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Admin/log read dacte" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'dacte' AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'logistica'::app_role)));
CREATE POLICY "Admin/log upload dacte" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'dacte' AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'logistica'::app_role)));
CREATE POLICY "Admin/log update dacte" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'dacte' AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'logistica'::app_role)));
CREATE POLICY "Admin/log delete dacte" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'dacte' AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'logistica'::app_role)));
