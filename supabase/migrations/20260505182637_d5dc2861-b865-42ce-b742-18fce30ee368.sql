ALTER TABLE public.carregamentos_dia ADD COLUMN IF NOT EXISTS ordem_carga text;
ALTER TABLE public.ctes_dacte ADD COLUMN IF NOT EXISTS ordem_carga text;
CREATE INDEX IF NOT EXISTS idx_carregamentos_dia_ordem_carga ON public.carregamentos_dia (ordem_carga);
CREATE INDEX IF NOT EXISTS idx_ctes_dacte_ordem_carga ON public.ctes_dacte (ordem_carga);