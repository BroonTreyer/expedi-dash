
-- #15: Restrict DELETE on carregamentos_dia to admin
DROP POLICY IF EXISTS "Authenticated delete carregamentos_dia" ON public.carregamentos_dia;
CREATE POLICY "Admin delete carregamentos_dia"
ON public.carregamentos_dia
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- #16: Restrict DELETE on catalog tables to admin
DROP POLICY IF EXISTS "Authenticated delete produtos" ON public.produtos;
CREATE POLICY "Admin delete produtos"
ON public.produtos
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Authenticated delete vendedores" ON public.vendedores;
CREATE POLICY "Admin delete vendedores"
ON public.vendedores
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Authenticated delete tipos_caminhao" ON public.tipos_caminhao;
CREATE POLICY "Admin delete tipos_caminhao"
ON public.tipos_caminhao
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Authenticated delete clientes" ON public.clientes;
CREATE POLICY "Admin delete clientes"
ON public.clientes
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- #12: Add UNIQUE constraint on codigo_cliente for safe upsert
ALTER TABLE public.clientes ADD CONSTRAINT clientes_codigo_cliente_unique UNIQUE (codigo_cliente);
