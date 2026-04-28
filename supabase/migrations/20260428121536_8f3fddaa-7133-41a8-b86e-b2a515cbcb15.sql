
UPDATE public.carregamentos_dia
SET peso = peso_original
WHERE peso_original IS NOT NULL
  AND peso IS NOT NULL
  AND peso > peso_original * 1.001;
