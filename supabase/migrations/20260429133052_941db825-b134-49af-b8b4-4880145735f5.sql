DROP POLICY IF EXISTS "Ops insert ocorrencias_carga" ON public.ocorrencias_carga;

CREATE POLICY "Ops insert ocorrencias_carga"
ON public.ocorrencias_carga FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'logistica'::app_role)
);