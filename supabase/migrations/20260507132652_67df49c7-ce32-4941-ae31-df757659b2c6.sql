
-- 1) combustivel_precos
CREATE TABLE IF NOT EXISTS public.combustivel_precos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  uf text NOT NULL,
  tipo text NOT NULL DEFAULT 'diesel_s10',
  valor_litro numeric NOT NULL,
  fonte text DEFAULT 'anp',
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (uf, tipo)
);
ALTER TABLE public.combustivel_precos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated select combustivel_precos"
  ON public.combustivel_precos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin insert combustivel_precos"
  ON public.combustivel_precos FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin update combustivel_precos"
  ON public.combustivel_precos FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- 2) rotas_executadas
CREATE TABLE IF NOT EXISTS public.rotas_executadas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  carga_id text NOT NULL,
  data_referencia date NOT NULL DEFAULT CURRENT_DATE,
  km_planejado numeric,
  km_real numeric,
  custo_planejado numeric,
  custo_real numeric,
  duracao_planejada_min numeric,
  duracao_real_min numeric,
  ordem_planejada jsonb DEFAULT '[]'::jsonb,
  provider text,
  tipo_caminhao text,
  origem text,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  criado_por uuid,
  UNIQUE (carga_id)
);
CREATE INDEX IF NOT EXISTS idx_rotas_executadas_carga ON public.rotas_executadas (carga_id);
CREATE INDEX IF NOT EXISTS idx_rotas_executadas_data ON public.rotas_executadas (data_referencia DESC);

ALTER TABLE public.rotas_executadas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ops select rotas_executadas"
  ON public.rotas_executadas FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(),'admin'::app_role)
    OR public.has_role(auth.uid(),'logistica'::app_role)
    OR public.has_role(auth.uid(),'faturamento'::app_role)
  );
CREATE POLICY "Ops insert rotas_executadas"
  ON public.rotas_executadas FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(),'admin'::app_role)
    OR public.has_role(auth.uid(),'logistica'::app_role)
  );
CREATE POLICY "Ops update rotas_executadas"
  ON public.rotas_executadas FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(),'admin'::app_role)
    OR public.has_role(auth.uid(),'logistica'::app_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(),'admin'::app_role)
    OR public.has_role(auth.uid(),'logistica'::app_role)
  );
CREATE POLICY "Admin delete rotas_executadas"
  ON public.rotas_executadas FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role));

CREATE TRIGGER trg_rotas_executadas_updated
  BEFORE UPDATE ON public.rotas_executadas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) app_settings default
INSERT INTO public.app_settings (key, value)
VALUES ('rota_tempo_descarga_min', '30'::jsonb)
ON CONFLICT (key) DO NOTHING;
