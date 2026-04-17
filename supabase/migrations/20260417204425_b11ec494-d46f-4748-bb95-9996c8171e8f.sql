CREATE TABLE IF NOT EXISTS public.cep_cache (
  cep text PRIMARY KEY,
  cidade text NOT NULL,
  uf text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cep_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated select cep_cache"
ON public.cep_cache FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated insert cep_cache"
ON public.cep_cache FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated update cep_cache"
ON public.cep_cache FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);