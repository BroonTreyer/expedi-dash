-- 1) Limpa duplicatas: para cada carga_id com múltiplas linhas walk_in=false, mantém apenas a mais antiga
WITH dups AS (
  SELECT id,
    ROW_NUMBER() OVER (PARTITION BY carga_id ORDER BY created_at ASC) as rn
  FROM public.veiculos_esperados
  WHERE carga_id IS NOT NULL
    AND walk_in = false
)
DELETE FROM public.veiculos_esperados
WHERE id IN (SELECT id FROM dups WHERE rn > 1);

-- 2) Índice parcial: impede futuras duplicatas de previsão automática
CREATE UNIQUE INDEX IF NOT EXISTS veiculos_esperados_carga_id_unique_previsto
  ON public.veiculos_esperados (carga_id)
  WHERE walk_in = false AND carga_id IS NOT NULL;