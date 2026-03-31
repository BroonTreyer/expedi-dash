DROP POLICY "Admin delete veiculos_esperados" ON public.veiculos_esperados;

CREATE POLICY "Authenticated delete veiculos_esperados"
ON public.veiculos_esperados
FOR DELETE
TO authenticated
USING (true);