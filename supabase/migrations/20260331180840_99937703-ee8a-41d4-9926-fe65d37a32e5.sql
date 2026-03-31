
CREATE TABLE public.motoristas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_completo text NOT NULL,
  telefone text,
  foto_documento_url text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.motoristas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated select motoristas" ON public.motoristas
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Ops insert motoristas" ON public.motoristas
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'logistica'::app_role) OR has_role(auth.uid(), 'portaria'::app_role));

CREATE POLICY "Ops update motoristas" ON public.motoristas
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'logistica'::app_role) OR has_role(auth.uid(), 'portaria'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'logistica'::app_role) OR has_role(auth.uid(), 'portaria'::app_role));

CREATE POLICY "Admin delete motoristas" ON public.motoristas
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
