DROP POLICY IF EXISTS "Auth select mp_fornecedores" ON public.mp_fornecedores;
CREATE POLICY "Ops select mp_fornecedores" ON public.mp_fornecedores
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'logistica'::app_role)
  OR has_role(auth.uid(), 'faturamento'::app_role)
  OR has_role(auth.uid(), 'portaria'::app_role)
);