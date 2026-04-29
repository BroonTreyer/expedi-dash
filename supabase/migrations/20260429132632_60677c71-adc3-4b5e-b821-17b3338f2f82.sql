CREATE TABLE public.ocorrencias_carga (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  tipo text NOT NULL DEFAULT 'carga_cancelada',
  motivo text NOT NULL,
  observacao text,
  carga_id text,
  nome_carga text,
  placa text,
  motorista text,
  transportadora text,
  peso_total numeric,
  qtd_pedidos integer,
  data_carga date,
  registrado_por uuid,
  registrado_por_email text
);

CREATE INDEX idx_ocorrencias_carga_created_at ON public.ocorrencias_carga (created_at DESC);
CREATE INDEX idx_ocorrencias_carga_carga_id ON public.ocorrencias_carga (carga_id);

ALTER TABLE public.ocorrencias_carga ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ops select ocorrencias_carga"
ON public.ocorrencias_carga FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'logistica'::app_role) OR
  has_role(auth.uid(), 'portaria'::app_role) OR
  has_role(auth.uid(), 'faturamento'::app_role)
);

CREATE POLICY "Ops insert ocorrencias_carga"
ON public.ocorrencias_carga FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'logistica'::app_role) OR
  has_role(auth.uid(), 'portaria'::app_role)
);

CREATE POLICY "Admin update ocorrencias_carga"
ON public.ocorrencias_carga FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin delete ocorrencias_carga"
ON public.ocorrencias_carga FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));