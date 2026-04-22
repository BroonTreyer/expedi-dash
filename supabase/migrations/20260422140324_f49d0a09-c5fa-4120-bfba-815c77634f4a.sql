-- ============================================
-- 1. Atualizar audit_carregamentos para guardar snapshot completo no DELETE
-- ============================================
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
    _changes := jsonb_build_object(
      'excluido', jsonb_build_object('pedido', OLD.numero_pedido, 'produto', OLD.nome_produto, 'cliente', OLD.cliente),
      'deleted_row', to_jsonb(OLD)
    );
  END IF;

  INSERT INTO public.audit_log (entity_type, entity_id, action, user_id, user_email, changes)
  VALUES ('carregamento', COALESCE(NEW.id, OLD.id)::text, _action, auth.uid(), COALESCE(_email, ''), _changes);

  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- ============================================
-- 2. Atualizar audit_movimentacoes para guardar snapshot completo no DELETE
-- ============================================
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

-- ============================================
-- 3. Função genérica para auditoria de tabelas de cadastro
-- ============================================
CREATE OR REPLACE FUNCTION public.audit_generic_cadastro()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _changes jsonb;
  _action text;
  _email text;
  _entity_type text := TG_ARGV[0];
  _resumo jsonb;
BEGIN
  SELECT email INTO _email FROM public.profiles WHERE id = auth.uid();
  
  IF TG_OP = 'INSERT' THEN
    _action := 'criado';
    _changes := jsonb_build_object('novo', to_jsonb(NEW));
  ELSIF TG_OP = 'UPDATE' THEN
    _action := 'alterado';
    -- Diff: comparar to_jsonb(OLD) vs to_jsonb(NEW), guardar só o que mudou
    SELECT jsonb_object_agg(key, jsonb_build_object('de', old_val, 'para', new_val))
    INTO _changes
    FROM (
      SELECT key, o.value AS old_val, n.value AS new_val
      FROM jsonb_each(to_jsonb(OLD)) o
      FULL OUTER JOIN jsonb_each(to_jsonb(NEW)) n USING (key)
      WHERE o.value IS DISTINCT FROM n.value
        AND key NOT IN ('created_at', 'updated_at')
    ) diff;
    
    IF _changes IS NULL OR _changes = '{}'::jsonb THEN
      RETURN NEW;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    _action := 'excluido';
    -- Resumo legível por tipo
    _resumo := CASE _entity_type
      WHEN 'cliente' THEN jsonb_build_object('codigo', to_jsonb(OLD)->>'codigo_cliente', 'nome', to_jsonb(OLD)->>'nome_cliente')
      WHEN 'produto' THEN jsonb_build_object('codigo', to_jsonb(OLD)->>'codigo_produto', 'nome', to_jsonb(OLD)->>'nome_produto')
      WHEN 'motorista' THEN jsonb_build_object('nome', to_jsonb(OLD)->>'nome_completo', 'cpf', to_jsonb(OLD)->>'cpf')
      WHEN 'caminhao' THEN jsonb_build_object('placa', to_jsonb(OLD)->>'placa', 'transportadora', to_jsonb(OLD)->>'transportadora')
      WHEN 'vendedor' THEN jsonb_build_object('codigo', to_jsonb(OLD)->>'codigo_vendedor', 'nome', to_jsonb(OLD)->>'nome_vendedor')
      WHEN 'veiculo_esperado' THEN jsonb_build_object('placa', to_jsonb(OLD)->>'placa', 'motorista', to_jsonb(OLD)->>'motorista', 'carga_id', to_jsonb(OLD)->>'carga_id')
      ELSE jsonb_build_object('id', (to_jsonb(OLD)->>'id'))
    END;
    _changes := jsonb_build_object('excluido', _resumo, 'deleted_row', to_jsonb(OLD));
  END IF;

  INSERT INTO public.audit_log (entity_type, entity_id, action, user_id, user_email, changes)
  VALUES (_entity_type, COALESCE((to_jsonb(NEW)->>'id'), (to_jsonb(OLD)->>'id')), _action, auth.uid(), COALESCE(_email, ''), _changes);

  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- ============================================
-- 4. Triggers de auditoria nas tabelas de cadastro
-- ============================================
DROP TRIGGER IF EXISTS audit_clientes_trigger ON public.clientes;
CREATE TRIGGER audit_clientes_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.clientes
FOR EACH ROW EXECUTE FUNCTION public.audit_generic_cadastro('cliente');

DROP TRIGGER IF EXISTS audit_produtos_trigger ON public.produtos;
CREATE TRIGGER audit_produtos_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.produtos
FOR EACH ROW EXECUTE FUNCTION public.audit_generic_cadastro('produto');

DROP TRIGGER IF EXISTS audit_motoristas_trigger ON public.motoristas;
CREATE TRIGGER audit_motoristas_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.motoristas
FOR EACH ROW EXECUTE FUNCTION public.audit_generic_cadastro('motorista');

DROP TRIGGER IF EXISTS audit_caminhoes_trigger ON public.caminhoes;
CREATE TRIGGER audit_caminhoes_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.caminhoes
FOR EACH ROW EXECUTE FUNCTION public.audit_generic_cadastro('caminhao');

DROP TRIGGER IF EXISTS audit_vendedores_trigger ON public.vendedores;
CREATE TRIGGER audit_vendedores_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.vendedores
FOR EACH ROW EXECUTE FUNCTION public.audit_generic_cadastro('vendedor');

DROP TRIGGER IF EXISTS audit_veiculos_esperados_trigger ON public.veiculos_esperados;
CREATE TRIGGER audit_veiculos_esperados_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.veiculos_esperados
FOR EACH ROW EXECUTE FUNCTION public.audit_generic_cadastro('veiculo_esperado');

-- ============================================
-- 5. Garantir que triggers de carregamentos e movimentacoes existam (idempotente)
-- ============================================
DROP TRIGGER IF EXISTS audit_carregamentos_trigger ON public.carregamentos_dia;
CREATE TRIGGER audit_carregamentos_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.carregamentos_dia
FOR EACH ROW EXECUTE FUNCTION public.audit_carregamentos();

DROP TRIGGER IF EXISTS audit_movimentacoes_trigger ON public.movimentacoes_portaria;
CREATE TRIGGER audit_movimentacoes_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.movimentacoes_portaria
FOR EACH ROW EXECUTE FUNCTION public.audit_movimentacoes();