-- Enable realtime for carregamentos_dia
ALTER PUBLICATION supabase_realtime ADD TABLE public.carregamentos_dia;

-- Fix RLS policies: drop RESTRICTIVE and recreate as PERMISSIVE for all tables

-- carregamentos_dia
DROP POLICY IF EXISTS "Allow select carregamentos_dia" ON public.carregamentos_dia;
DROP POLICY IF EXISTS "Allow insert carregamentos_dia" ON public.carregamentos_dia;
DROP POLICY IF EXISTS "Allow update carregamentos_dia" ON public.carregamentos_dia;
DROP POLICY IF EXISTS "Allow delete carregamentos_dia" ON public.carregamentos_dia;

CREATE POLICY "Allow select carregamentos_dia" ON public.carregamentos_dia FOR SELECT USING (true);
CREATE POLICY "Allow insert carregamentos_dia" ON public.carregamentos_dia FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update carregamentos_dia" ON public.carregamentos_dia FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow delete carregamentos_dia" ON public.carregamentos_dia FOR DELETE USING (true);

-- produtos
DROP POLICY IF EXISTS "Allow select produtos" ON public.produtos;
DROP POLICY IF EXISTS "Allow insert produtos" ON public.produtos;
DROP POLICY IF EXISTS "Allow update produtos" ON public.produtos;
DROP POLICY IF EXISTS "Allow delete produtos" ON public.produtos;

CREATE POLICY "Allow select produtos" ON public.produtos FOR SELECT USING (true);
CREATE POLICY "Allow insert produtos" ON public.produtos FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update produtos" ON public.produtos FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow delete produtos" ON public.produtos FOR DELETE USING (true);

-- vendedores
DROP POLICY IF EXISTS "Allow select vendedores" ON public.vendedores;
DROP POLICY IF EXISTS "Allow insert vendedores" ON public.vendedores;
DROP POLICY IF EXISTS "Allow update vendedores" ON public.vendedores;
DROP POLICY IF EXISTS "Allow delete vendedores" ON public.vendedores;

CREATE POLICY "Allow select vendedores" ON public.vendedores FOR SELECT USING (true);
CREATE POLICY "Allow insert vendedores" ON public.vendedores FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update vendedores" ON public.vendedores FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow delete vendedores" ON public.vendedores FOR DELETE USING (true);

-- tipos_caminhao
DROP POLICY IF EXISTS "Allow select tipos_caminhao" ON public.tipos_caminhao;
DROP POLICY IF EXISTS "Allow insert tipos_caminhao" ON public.tipos_caminhao;
DROP POLICY IF EXISTS "Allow delete tipos_caminhao" ON public.tipos_caminhao;

CREATE POLICY "Allow select tipos_caminhao" ON public.tipos_caminhao FOR SELECT USING (true);
CREATE POLICY "Allow insert tipos_caminhao" ON public.tipos_caminhao FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update tipos_caminhao" ON public.tipos_caminhao FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow delete tipos_caminhao" ON public.tipos_caminhao FOR DELETE USING (true);