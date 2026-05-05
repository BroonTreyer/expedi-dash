-- 1) Correção pontual do KM Inicial do FABRICIO
UPDATE public.movimentacoes_portaria
SET km_inicial = 132667
WHERE id = '60664836-74c2-4b45-a4ac-b4d86eb6d5ee';

-- 2) Amplia trigger de auditoria para incluir KM
CREATE OR REPLACE FUNCTION public.audit_movimentacoes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _changes jsonb;
  _action text;
  _email text;
BEGIN
  SELECT email INTO _email FROM public.profiles WHERE id = auth.uid();

  IF TG_OP = 'INSERT' THEN
    _action := 'criado';
    _changes := jsonb_build_object(
      'tipo_movimento', NEW.tipo_movimento,
      'categoria', NEW.categoria,
      'placa', NEW.placa,
      'motorista', NEW.motorista
    );
  ELSIF TG_OP = 'UPDATE' THEN
    _action := 'alterado';
    _changes := '{}'::jsonb;
    IF OLD.etapa_terceirizado IS DISTINCT FROM NEW.etapa_terceirizado THEN
      _changes := _changes || jsonb_build_object('etapa_terceirizado', jsonb_build_object('de', OLD.etapa_terceirizado, 'para', NEW.etapa_terceirizado));
    END IF;
    IF OLD.etapa_carga_propria IS DISTINCT FROM NEW.etapa_carga_propria THEN
      _changes := _changes || jsonb_build_object('etapa_carga_propria', jsonb_build_object('de', OLD.etapa_carga_propria, 'para', NEW.etapa_carga_propria));
    END IF;
    IF OLD.numero_lacre IS DISTINCT FROM NEW.numero_lacre THEN
      _changes := _changes || jsonb_build_object('numero_lacre', jsonb_build_object('de', OLD.numero_lacre, 'para', NEW.numero_lacre));
    END IF;
    IF OLD.observacoes IS DISTINCT FROM NEW.observacoes THEN
      _changes := _changes || jsonb_build_object('observacoes', jsonb_build_object('de', OLD.observacoes, 'para', NEW.observacoes));
    END IF;
    IF OLD.km_inicial IS DISTINCT FROM NEW.km_inicial THEN
      _changes := _changes || jsonb_build_object('km_inicial', jsonb_build_object('de', OLD.km_inicial, 'para', NEW.km_inicial));
    END IF;
    IF OLD.km_final IS DISTINCT FROM NEW.km_final THEN
      _changes := _changes || jsonb_build_object('km_final', jsonb_build_object('de', OLD.km_final, 'para', NEW.km_final));
    END IF;
    IF OLD.km_rodado IS DISTINCT FROM NEW.km_rodado THEN
      _changes := _changes || jsonb_build_object('km_rodado', jsonb_build_object('de', OLD.km_rodado, 'para', NEW.km_rodado));
    END IF;
    IF _changes = '{}'::jsonb THEN RETURN NEW; END IF;
  ELSIF TG_OP = 'DELETE' THEN
    _action := 'excluido';
    _changes := jsonb_build_object(
      'excluido', jsonb_build_object('tipo', OLD.tipo_movimento, 'placa', OLD.placa, 'categoria', OLD.categoria, 'motorista', OLD.motorista),
      'deleted_row', to_jsonb(OLD)
    );
  END IF;

  INSERT INTO public.audit_log (entity_type, entity_id, action, user_id, user_email, changes)
  VALUES ('movimentacao', COALESCE(NEW.id, OLD.id)::text, _action, auth.uid(), COALESCE(_email, ''), _changes);

  RETURN COALESCE(NEW, OLD);
END;
$function$;