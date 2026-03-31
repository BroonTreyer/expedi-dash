
-- =============================================
-- FASE 1: SEGURANÇA RLS
-- =============================================

-- 1.1 Restringir INSERT em tabelas de cadastro (admin + faturamento)
DROP POLICY IF EXISTS "Authenticated insert produtos" ON public.produtos;
CREATE POLICY "Admin/faturamento insert produtos" ON public.produtos
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'faturamento')
  );

DROP POLICY IF EXISTS "Authenticated update produtos" ON public.produtos;
CREATE POLICY "Admin/faturamento update produtos" ON public.produtos
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'faturamento'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'faturamento'));

DROP POLICY IF EXISTS "Authenticated insert vendedores" ON public.vendedores;
CREATE POLICY "Admin/faturamento insert vendedores" ON public.vendedores
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'faturamento')
  );

DROP POLICY IF EXISTS "Authenticated update vendedores" ON public.vendedores;
CREATE POLICY "Admin/faturamento update vendedores" ON public.vendedores
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'faturamento'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'faturamento'));

DROP POLICY IF EXISTS "Authenticated insert clientes" ON public.clientes;
CREATE POLICY "Admin/faturamento insert clientes" ON public.clientes
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'faturamento')
  );

DROP POLICY IF EXISTS "Authenticated update clientes" ON public.clientes;
CREATE POLICY "Admin/faturamento update clientes" ON public.clientes
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'faturamento'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'faturamento'));

DROP POLICY IF EXISTS "Authenticated insert tipos_caminhao" ON public.tipos_caminhao;
CREATE POLICY "Admin/faturamento insert tipos_caminhao" ON public.tipos_caminhao
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'faturamento')
  );

DROP POLICY IF EXISTS "Authenticated update tipos_caminhao" ON public.tipos_caminhao;
CREATE POLICY "Admin/faturamento update tipos_caminhao" ON public.tipos_caminhao
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'faturamento'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'faturamento'));

-- 1.1b Restringir INSERT/UPDATE carregamentos (admin + faturamento + logistica)
DROP POLICY IF EXISTS "Authenticated insert carregamentos_dia" ON public.carregamentos_dia;
CREATE POLICY "Ops insert carregamentos_dia" ON public.carregamentos_dia
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'faturamento') OR public.has_role(auth.uid(), 'logistica')
  );

DROP POLICY IF EXISTS "Authenticated update carregamentos_dia" ON public.carregamentos_dia;
CREATE POLICY "Ops update carregamentos_dia" ON public.carregamentos_dia
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'faturamento') OR public.has_role(auth.uid(), 'logistica'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'faturamento') OR public.has_role(auth.uid(), 'logistica'));

-- 1.1c Restringir INSERT/UPDATE movimentacoes_portaria (todos exceto leitura-apenas)
DROP POLICY IF EXISTS "Authenticated insert movimentacoes_portaria" ON public.movimentacoes_portaria;
CREATE POLICY "Ops insert movimentacoes_portaria" ON public.movimentacoes_portaria
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'logistica') OR public.has_role(auth.uid(), 'portaria')
  );

DROP POLICY IF EXISTS "Authenticated update movimentacoes_portaria" ON public.movimentacoes_portaria;
CREATE POLICY "Ops update movimentacoes_portaria" ON public.movimentacoes_portaria
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'logistica') OR public.has_role(auth.uid(), 'portaria'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'logistica') OR public.has_role(auth.uid(), 'portaria'));

-- 1.1d veiculos_esperados INSERT/UPDATE (admin + logistica + portaria)
DROP POLICY IF EXISTS "Authenticated insert veiculos_esperados" ON public.veiculos_esperados;
CREATE POLICY "Ops insert veiculos_esperados" ON public.veiculos_esperados
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'logistica') OR public.has_role(auth.uid(), 'portaria')
  );

DROP POLICY IF EXISTS "Authenticated update veiculos_esperados" ON public.veiculos_esperados;
CREATE POLICY "Ops update veiculos_esperados" ON public.veiculos_esperados
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'logistica') OR public.has_role(auth.uid(), 'portaria'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'logistica') OR public.has_role(auth.uid(), 'portaria'));

-- 1.2 Restringir DELETE veiculos_esperados (admin + logistica)
DROP POLICY IF EXISTS "Authenticated delete veiculos_esperados" ON public.veiculos_esperados;
CREATE POLICY "Admin/logistica delete veiculos_esperados" ON public.veiculos_esperados
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'logistica'));

-- FASE 5: UNIQUE CONSTRAINTS
ALTER TABLE public.produtos ADD CONSTRAINT produtos_codigo_produto_unique UNIQUE (codigo_produto);
ALTER TABLE public.vendedores ADD CONSTRAINT vendedores_codigo_vendedor_unique UNIQUE (codigo_vendedor);
