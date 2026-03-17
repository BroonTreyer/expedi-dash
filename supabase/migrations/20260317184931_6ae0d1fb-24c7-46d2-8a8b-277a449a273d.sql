
-- FASE 1: Corrigir RLS em todas as tabelas operacionais para exigir autenticação

-- carregamentos_dia: Drop permissive public policies, add authenticated-only
DROP POLICY IF EXISTS "Allow select carregamentos_dia" ON public.carregamentos_dia;
DROP POLICY IF EXISTS "Allow insert carregamentos_dia" ON public.carregamentos_dia;
DROP POLICY IF EXISTS "Allow update carregamentos_dia" ON public.carregamentos_dia;
DROP POLICY IF EXISTS "Allow delete carregamentos_dia" ON public.carregamentos_dia;

CREATE POLICY "Authenticated select carregamentos_dia"
  ON public.carregamentos_dia FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert carregamentos_dia"
  ON public.carregamentos_dia FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update carregamentos_dia"
  ON public.carregamentos_dia FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated delete carregamentos_dia"
  ON public.carregamentos_dia FOR DELETE TO authenticated USING (true);

-- clientes
DROP POLICY IF EXISTS "Allow select clientes" ON public.clientes;
DROP POLICY IF EXISTS "Allow insert clientes" ON public.clientes;
DROP POLICY IF EXISTS "Allow update clientes" ON public.clientes;
DROP POLICY IF EXISTS "Allow delete clientes" ON public.clientes;

CREATE POLICY "Authenticated select clientes"
  ON public.clientes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert clientes"
  ON public.clientes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update clientes"
  ON public.clientes FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated delete clientes"
  ON public.clientes FOR DELETE TO authenticated USING (true);

-- produtos
DROP POLICY IF EXISTS "Allow select produtos" ON public.produtos;
DROP POLICY IF EXISTS "Allow insert produtos" ON public.produtos;
DROP POLICY IF EXISTS "Allow update produtos" ON public.produtos;
DROP POLICY IF EXISTS "Allow delete produtos" ON public.produtos;

CREATE POLICY "Authenticated select produtos"
  ON public.produtos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert produtos"
  ON public.produtos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update produtos"
  ON public.produtos FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated delete produtos"
  ON public.produtos FOR DELETE TO authenticated USING (true);

-- vendedores
DROP POLICY IF EXISTS "Allow select vendedores" ON public.vendedores;
DROP POLICY IF EXISTS "Allow insert vendedores" ON public.vendedores;
DROP POLICY IF EXISTS "Allow update vendedores" ON public.vendedores;
DROP POLICY IF EXISTS "Allow delete vendedores" ON public.vendedores;

CREATE POLICY "Authenticated select vendedores"
  ON public.vendedores FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert vendedores"
  ON public.vendedores FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update vendedores"
  ON public.vendedores FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated delete vendedores"
  ON public.vendedores FOR DELETE TO authenticated USING (true);

-- tipos_caminhao
DROP POLICY IF EXISTS "Allow select tipos_caminhao" ON public.tipos_caminhao;
DROP POLICY IF EXISTS "Allow insert tipos_caminhao" ON public.tipos_caminhao;
DROP POLICY IF EXISTS "Allow update tipos_caminhao" ON public.tipos_caminhao;
DROP POLICY IF EXISTS "Allow delete tipos_caminhao" ON public.tipos_caminhao;

CREATE POLICY "Authenticated select tipos_caminhao"
  ON public.tipos_caminhao FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert tipos_caminhao"
  ON public.tipos_caminhao FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update tipos_caminhao"
  ON public.tipos_caminhao FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated delete tipos_caminhao"
  ON public.tipos_caminhao FOR DELETE TO authenticated USING (true);
