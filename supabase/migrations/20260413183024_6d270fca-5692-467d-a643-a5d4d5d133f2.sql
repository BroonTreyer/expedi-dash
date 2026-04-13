
DROP POLICY "Admin/faturamento insert clientes" ON public.clientes;
CREATE POLICY "Ops insert clientes" ON public.clientes
  FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'faturamento'::app_role) OR
    has_role(auth.uid(), 'logistica'::app_role)
  );

DROP POLICY "Admin/faturamento update clientes" ON public.clientes;
CREATE POLICY "Ops update clientes" ON public.clientes
  FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'faturamento'::app_role) OR
    has_role(auth.uid(), 'logistica'::app_role)
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'faturamento'::app_role) OR
    has_role(auth.uid(), 'logistica'::app_role)
  );
