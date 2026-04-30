DROP POLICY IF EXISTS "Ops select movimentacoes_portaria" ON public.movimentacoes_portaria;
CREATE POLICY "Ops select movimentacoes_portaria"
  ON public.movimentacoes_portaria FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'logistica'::app_role)
    OR has_role(auth.uid(), 'portaria'::app_role)
    OR has_role(auth.uid(), 'expedicao'::app_role)
  );