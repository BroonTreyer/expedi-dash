
-- 1. Restrict SELECT on movimentacoes_portaria to relevant roles
DROP POLICY IF EXISTS "Authenticated select movimentacoes_portaria" ON public.movimentacoes_portaria;
CREATE POLICY "Ops select movimentacoes_portaria" ON public.movimentacoes_portaria
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'logistica') OR public.has_role(auth.uid(), 'portaria')
  );

-- 2. Restrict SELECT on registros_portaria to relevant roles
DROP POLICY IF EXISTS "Authenticated select registros_portaria" ON public.registros_portaria;
CREATE POLICY "Ops select registros_portaria" ON public.registros_portaria
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'logistica') OR public.has_role(auth.uid(), 'portaria')
  );

-- 3. Make portaria bucket private
UPDATE storage.buckets SET public = false WHERE id = 'portaria';

-- 4. Drop existing overly permissive storage SELECT policy and create role-based one
DROP POLICY IF EXISTS "Authenticated read portaria" ON storage.objects;
DROP POLICY IF EXISTS "Public read portaria" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read portaria" ON storage.objects;

CREATE POLICY "Ops read portaria storage" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'portaria' AND (
      public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'logistica') OR public.has_role(auth.uid(), 'portaria')
    )
  );

-- 5. Add DELETE policy on storage for admin+logistica
CREATE POLICY "Admin/logistica delete portaria storage" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'portaria' AND (
      public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'logistica')
    )
  );

-- 6. Add UPDATE policy on storage for admin+logistica
CREATE POLICY "Admin/logistica update portaria storage" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'portaria' AND (
      public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'logistica')
    )
  )
  WITH CHECK (
    bucket_id = 'portaria' AND (
      public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'logistica')
    )
  );
