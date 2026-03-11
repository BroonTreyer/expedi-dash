
-- Fix RLS: Drop restrictive policies and create permissive ones
DROP POLICY IF EXISTS "Allow full access to carregamentos_dia" ON public.carregamentos_dia;
DROP POLICY IF EXISTS "Allow full access to produtos" ON public.produtos;
DROP POLICY IF EXISTS "Allow full access to vendedores" ON public.vendedores;
DROP POLICY IF EXISTS "Allow full access to tipos_caminhao" ON public.tipos_caminhao;

CREATE POLICY "Allow select carregamentos_dia" ON public.carregamentos_dia FOR SELECT USING (true);
CREATE POLICY "Allow insert carregamentos_dia" ON public.carregamentos_dia FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update carregamentos_dia" ON public.carregamentos_dia FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow delete carregamentos_dia" ON public.carregamentos_dia FOR DELETE USING (true);

CREATE POLICY "Allow select produtos" ON public.produtos FOR SELECT USING (true);
CREATE POLICY "Allow insert produtos" ON public.produtos FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update produtos" ON public.produtos FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow delete produtos" ON public.produtos FOR DELETE USING (true);

CREATE POLICY "Allow select vendedores" ON public.vendedores FOR SELECT USING (true);
CREATE POLICY "Allow insert vendedores" ON public.vendedores FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update vendedores" ON public.vendedores FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow delete vendedores" ON public.vendedores FOR DELETE USING (true);

CREATE POLICY "Allow select tipos_caminhao" ON public.tipos_caminhao FOR SELECT USING (true);
CREATE POLICY "Allow insert tipos_caminhao" ON public.tipos_caminhao FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow delete tipos_caminhao" ON public.tipos_caminhao FOR DELETE USING (true);

-- Re-add foreign key if missing
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'carregamentos_dia_vendedor_id_fkey'
  ) THEN
    ALTER TABLE public.carregamentos_dia 
      ADD CONSTRAINT carregamentos_dia_vendedor_id_fkey 
      FOREIGN KEY (vendedor_id) REFERENCES public.vendedores(id);
  END IF;
END $$;

-- Re-add trigger if missing
DROP TRIGGER IF EXISTS update_carregamentos_dia_updated_at ON public.carregamentos_dia;
CREATE TRIGGER update_carregamentos_dia_updated_at
  BEFORE UPDATE ON public.carregamentos_dia
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
