
CREATE TABLE public.caminhoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  placa TEXT NOT NULL,
  renavam TEXT,
  tipo_caminhao TEXT,
  motorista_id UUID REFERENCES public.motoristas(id) ON DELETE SET NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT caminhoes_placa_unique UNIQUE (placa)
);

ALTER TABLE public.caminhoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated select caminhoes"
ON public.caminhoes FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Ops insert caminhoes"
ON public.caminhoes FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'logistica'::app_role)
  OR has_role(auth.uid(), 'portaria'::app_role)
);

CREATE POLICY "Ops update caminhoes"
ON public.caminhoes FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'logistica'::app_role)
  OR has_role(auth.uid(), 'portaria'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'logistica'::app_role)
  OR has_role(auth.uid(), 'portaria'::app_role)
);

CREATE POLICY "Admin delete caminhoes"
ON public.caminhoes FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));
