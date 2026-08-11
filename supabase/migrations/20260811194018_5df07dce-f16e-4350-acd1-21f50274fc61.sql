CREATE UNIQUE INDEX IF NOT EXISTS ctes_dacte_unico_numero_serie_transp
  ON public.ctes_dacte (numero_cte, coalesce(serie, ''), upper(btrim(coalesce(transportadora, ''))));