DROP TRIGGER IF EXISTS trg_audit_carregamentos ON public.carregamentos_dia;
DROP TRIGGER IF EXISTS trg_audit_movimentacoes ON public.movimentacoes_portaria;

DELETE FROM public.audit_log a
USING public.audit_log b
WHERE a.id > b.id
  AND a.entity_type = b.entity_type
  AND a.entity_id = b.entity_id
  AND a.action = b.action
  AND a.created_at = b.created_at
  AND a.changes::text = b.changes::text;