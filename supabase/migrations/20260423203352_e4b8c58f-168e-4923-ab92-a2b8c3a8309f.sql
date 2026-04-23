ALTER TABLE public.audit_log
  ADD COLUMN IF NOT EXISTS operation_id uuid,
  ADD COLUMN IF NOT EXISTS logical_entity_type text,
  ADD COLUMN IF NOT EXISTS logical_entity_id text;

CREATE INDEX IF NOT EXISTS idx_audit_log_operation_id ON public.audit_log(operation_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_logical ON public.audit_log(logical_entity_type, logical_entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON public.audit_log(created_at DESC);

CREATE OR REPLACE FUNCTION public.log_audit(
  _entity_type text,
  _entity_id text,
  _action text,
  _changes jsonb DEFAULT '{}'::jsonb,
  _operation_id uuid DEFAULT NULL,
  _logical_entity_type text DEFAULT NULL,
  _logical_entity_id text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _email text;
BEGIN
  SELECT email INTO _email FROM public.profiles WHERE id = auth.uid();
  INSERT INTO public.audit_log (entity_type, entity_id, action, user_id, user_email, changes, operation_id, logical_entity_type, logical_entity_id)
  VALUES (_entity_type, _entity_id, _action, auth.uid(), COALESCE(_email, ''), _changes, _operation_id, _logical_entity_type, _logical_entity_id);
END;
$function$;