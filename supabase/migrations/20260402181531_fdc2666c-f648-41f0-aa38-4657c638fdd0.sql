ALTER TABLE public.carregamentos_dia
ADD COLUMN IF NOT EXISTS peso_manual boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.audit_carregamentos()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _changes jsonb := '{}'::jsonb;
  _action text;
  _email text;
BEGIN
  SELECT email INTO _email FROM public.profiles WHERE id = auth.uid();
  
  IF TG_OP = 'INSERT' THEN
    _action := 'criado';
    _changes := jsonb_build_object('novo', to_jsonb(NEW) - 'created_at' - 'updated_at');
  ELSIF TG_OP = 'UPDATE' THEN
    _action := 'alterado';
    _changes := '{}'::jsonb;

    IF OLD.status IS DISTINCT FROM NEW.status THEN
      _changes := _changes || jsonb_build_object('status', jsonb_build_object('de', OLD.status, 'para', NEW.status));
    END IF;
    IF OLD.etapa IS DISTINCT FROM NEW.etapa THEN
      _changes := _changes || jsonb_build_object('etapa', jsonb_build_object('de', OLD.etapa, 'para', NEW.etapa));
    END IF;
    IF OLD.placa IS DISTINCT FROM NEW.placa THEN
      _changes := _changes || jsonb_build_object('placa', jsonb_build_object('de', OLD.placa, 'para', NEW.placa));
    END IF;
    IF OLD.motorista IS DISTINCT FROM NEW.motorista THEN
      _changes := _changes || jsonb_build_object('motorista', jsonb_build_object('de', OLD.motorista, 'para', NEW.motorista));
    END IF;
    IF OLD.carga_id IS DISTINCT FROM NEW.carga_id THEN
      _changes := _changes || jsonb_build_object('carga_id', jsonb_build_object('de', OLD.carga_id, 'para', NEW.carga_id));
    END IF;
    IF OLD.nome_carga IS DISTINCT FROM NEW.nome_carga THEN
      _changes := _changes || jsonb_build_object('nome_carga', jsonb_build_object('de', OLD.nome_carga, 'para', NEW.nome_carga));
    END IF;
    IF OLD.ruptura IS DISTINCT FROM NEW.ruptura THEN
      _changes := _changes || jsonb_build_object('ruptura', jsonb_build_object('de', OLD.ruptura, 'para', NEW.ruptura));
    END IF;
    IF OLD.observacoes IS DISTINCT FROM NEW.observacoes THEN
      _changes := _changes || jsonb_build_object('observacoes', jsonb_build_object('de', OLD.observacoes, 'para', NEW.observacoes));
    END IF;
    IF OLD.ordem_entrega IS DISTINCT FROM NEW.ordem_entrega THEN
      _changes := _changes || jsonb_build_object('ordem_entrega', jsonb_build_object('de', OLD.ordem_entrega, 'para', NEW.ordem_entrega));
    END IF;
    IF OLD.transportadora IS DISTINCT FROM NEW.transportadora THEN
      _changes := _changes || jsonb_build_object('transportadora', jsonb_build_object('de', OLD.transportadora, 'para', NEW.transportadora));
    END IF;
    IF OLD.tipo_caminhao IS DISTINCT FROM NEW.tipo_caminhao THEN
      _changes := _changes || jsonb_build_object('tipo_caminhao', jsonb_build_object('de', OLD.tipo_caminhao, 'para', NEW.tipo_caminhao));
    END IF;
    IF OLD.horario_inicio IS DISTINCT FROM NEW.horario_inicio THEN
      _changes := _changes || jsonb_build_object('horario_inicio', jsonb_build_object('de', OLD.horario_inicio, 'para', NEW.horario_inicio));
    END IF;
    IF OLD.horario_fim IS DISTINCT FROM NEW.horario_fim THEN
      _changes := _changes || jsonb_build_object('horario_fim', jsonb_build_object('de', OLD.horario_fim, 'para', NEW.horario_fim));
    END IF;
    IF OLD.quantidade IS DISTINCT FROM NEW.quantidade THEN
      _changes := _changes || jsonb_build_object('quantidade', jsonb_build_object('de', OLD.quantidade, 'para', NEW.quantidade));
    END IF;
    IF OLD.peso IS DISTINCT FROM NEW.peso THEN
      _changes := _changes || jsonb_build_object('peso', jsonb_build_object('de', OLD.peso, 'para', NEW.peso));
    END IF;
    IF OLD.peso_manual IS DISTINCT FROM NEW.peso_manual THEN
      _changes := _changes || jsonb_build_object('peso_manual', jsonb_build_object('de', OLD.peso_manual, 'para', NEW.peso_manual));
    END IF;
    IF OLD.codigo_produto IS DISTINCT FROM NEW.codigo_produto THEN
      _changes := _changes || jsonb_build_object('codigo_produto', jsonb_build_object('de', OLD.codigo_produto, 'para', NEW.codigo_produto));
    END IF;
    IF OLD.nome_produto IS DISTINCT FROM NEW.nome_produto THEN
      _changes := _changes || jsonb_build_object('nome_produto', jsonb_build_object('de', OLD.nome_produto, 'para', NEW.nome_produto));
    END IF;

    IF _changes = '{}'::jsonb THEN
      RETURN NEW;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    _action := 'excluido';
    _changes := jsonb_build_object('excluido', jsonb_build_object('pedido', OLD.numero_pedido, 'produto', OLD.nome_produto, 'cliente', OLD.cliente));
  END IF;

  INSERT INTO public.audit_log (entity_type, entity_id, action, user_id, user_email, changes)
  VALUES ('carregamento', COALESCE(NEW.id, OLD.id)::text, _action, auth.uid(), COALESCE(_email, ''), _changes);

  RETURN COALESCE(NEW, OLD);
END;
$function$;