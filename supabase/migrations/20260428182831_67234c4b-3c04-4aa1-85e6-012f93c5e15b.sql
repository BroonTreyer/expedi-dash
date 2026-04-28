-- 1) Snapshot de segurança
INSERT INTO public.data_snapshots (id, description, snapshot_data, record_counts, created_by)
SELECT
  gen_random_uuid(),
  'Pre-restauracao CEARA SANTA INTES pedido #45 (12 itens achatados a 33.6kg)',
  jsonb_build_object('carregamentos_dia_pedido_45', jsonb_agg(to_jsonb(cd))),
  jsonb_build_object('carregamentos_dia', count(*)),
  NULL
FROM public.carregamentos_dia cd
WHERE (cd.nome_carga ILIKE '%SANTA INTES%' OR cd.nome_carga ILIKE '%SANTA INES%')
  AND cd.numero_pedido = 45;

-- 2) Restaurar 12 itens achatados a 33.6 usando o peso original do audit_log
WITH originais AS (
  SELECT DISTINCT ON (al.entity_id)
    al.entity_id::uuid AS id,
    (al.changes->'novo'->>'peso')::numeric AS peso_orig
  FROM public.audit_log al
  WHERE al.entity_type = 'carregamento'
    AND al.action = 'criado'
  ORDER BY al.entity_id, al.created_at ASC
)
UPDATE public.carregamentos_dia cd
SET peso = o.peso_orig,
    peso_original = o.peso_orig,
    peso_manual = true,
    ruptura_sinalizada = false
FROM originais o
WHERE cd.id = o.id
  AND (cd.nome_carga ILIKE '%SANTA INTES%' OR cd.nome_carga ILIKE '%SANTA INES%')
  AND cd.numero_pedido = 45
  AND cd.peso = 33.6
  AND o.peso_orig IS DISTINCT FROM 33.6;

-- 3) Corrigir PAO DE ALHO COM CALABRESA do pedido #45 (peso=6 real, peso_original estava 33.6)
UPDATE public.carregamentos_dia
SET peso_original = 6,
    ruptura_sinalizada = false,
    peso_manual = true
WHERE id = '6dde9391-0081-43fa-bc8d-be60e65d81b1'
  AND peso = 6
  AND peso_original = 33.6;

-- 4) Log da restauração
INSERT INTO public.audit_log (entity_type, entity_id, action, user_id, user_email, changes)
VALUES (
  'carregamento_lote',
  'CEARA_SANTA_INTES_pedido_45',
  'restaurado',
  NULL,
  'system',
  jsonb_build_object(
    'motivo', 'Restauracao de 12 itens achatados a 33.6kg via audit_log + correcao peso_original do PAO DE ALHO COM CALABRESA',
    'carga', 'CEARA SANTA INTES',
    'pedido', 45
  )
);