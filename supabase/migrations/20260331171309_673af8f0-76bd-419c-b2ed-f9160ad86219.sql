
DROP POLICY IF EXISTS "Authenticated insert registros_portaria" ON public.registros_portaria;
CREATE POLICY "Ops insert registros_portaria" ON public.registros_portaria
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'logistica') OR public.has_role(auth.uid(), 'portaria')
  );

DROP POLICY IF EXISTS "Authenticated update registros_portaria" ON public.registros_portaria;
CREATE POLICY "Ops update registros_portaria" ON public.registros_portaria
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'logistica') OR public.has_role(auth.uid(), 'portaria'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'logistica') OR public.has_role(auth.uid(), 'portaria'));
