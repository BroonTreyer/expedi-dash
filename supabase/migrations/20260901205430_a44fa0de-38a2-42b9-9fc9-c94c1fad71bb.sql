CREATE OR REPLACE FUNCTION public.audit_ctes_dacte()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _changes jsonb;
  _action text;
  _email text;
  _row jsonb;
  _resumo jsonb;
BEGIN
  SELECT email INTO _email FROM public.profiles WHERE id = auth.uid();
  _row := COALESCE(to_jsonb(NEW), to_jsonb(OLD)) - 'raw_extracao' - 'notas_fiscais';
  _resumo := jsonb_build_object(
    'numero_cte', _row->>'numero_cte',
    'serie', _row->>'serie',
    'transportadora', _row->>'transportadora',
    'ordem_carga', _row->>'ordem_carga',
    'carga_id', _row->>'carga_id',
    'valor_frete', _row->>'valor_frete',
    'status', _row->>'status'
  );

  IF TG_OP = 'INSERT' THEN
    _action := 'criado';
    _changes := jsonb_build_object('novo', _resumo);
  ELSIF TG_OP = 'UPDATE' THEN
    _action := 'alterado';
    SELECT jsonb_object_agg(key, jsonb_build_object('de', old_val, 'para', new_val))
    INTO _changes
    FROM (
      SELECT key, o.value AS old_val, n.value AS new_val
      FROM jsonb_each(to_jsonb(OLD) - 'raw_extracao') o
      FULL OUTER JOIN jsonb_each(to_jsonb(NEW) - 'raw_extracao') n USING (key)
      WHERE o.value IS DISTINCT FROM n.value
        AND key NOT IN ('created_at', 'updated_at')
    ) diff;
    IF _changes IS NULL OR _changes = '{}'::jsonb THEN
      RETURN NEW;
    END IF;
    _changes := _changes || jsonb_build_object('resumo', _resumo);
  ELSIF TG_OP = 'DELETE' THEN
    _action := 'excluido';
    _changes := jsonb_build_object('excluido', _resumo, 'deleted_row', _row);
  END IF;

  INSERT INTO public.audit_log (entity_type, entity_id, action, user_id, user_email, changes, logical_entity_type, logical_entity_id)
  VALUES ('ctes_dacte', _row->>'id', _action, auth.uid(), COALESCE(_email, ''), _changes, 'ordem_carga', _row->>'ordem_carga');

  RETURN COALESCE(NEW, OLD);
END;
$function$;

DROP TRIGGER IF EXISTS trg_audit_ctes_dacte ON public.ctes_dacte;
CREATE TRIGGER trg_audit_ctes_dacte
AFTER INSERT OR UPDATE OR DELETE ON public.ctes_dacte
FOR EACH ROW EXECUTE FUNCTION public.audit_ctes_dacte();