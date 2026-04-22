ALTER TABLE public.movimentacoes_portaria
ADD COLUMN IF NOT EXISTS horario_saida_final timestamp with time zone NULL;