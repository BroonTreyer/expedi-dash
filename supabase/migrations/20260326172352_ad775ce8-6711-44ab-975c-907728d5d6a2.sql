DROP POLICY IF EXISTS "Authenticated delete movimentacoes_portaria" ON public.movimentacoes_portaria;

CREATE POLICY "Admin delete movimentacoes_portaria"
ON public.movimentacoes_portaria
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));