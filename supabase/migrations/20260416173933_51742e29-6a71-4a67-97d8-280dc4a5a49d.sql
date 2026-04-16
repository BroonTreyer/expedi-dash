DROP POLICY IF EXISTS "Admin delete carregamentos_dia" ON public.carregamentos_dia;

CREATE POLICY "Admin/logistica delete carregamentos_dia"
ON public.carregamentos_dia
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'logistica'::app_role)
);