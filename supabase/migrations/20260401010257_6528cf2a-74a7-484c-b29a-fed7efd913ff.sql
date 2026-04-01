
-- Tabela de auditoria
CREATE TABLE public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  action text NOT NULL,
  user_id uuid,
  user_email text,
  changes jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_log_entity ON public.audit_log (entity_type, entity_id);
CREATE INDEX idx_audit_log_created ON public.audit_log (created_at DESC);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Leitura para admin, logística e faturamento
CREATE POLICY "Ops select audit_log"
  ON public.audit_log FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'logistica'::app_role) OR
    has_role(auth.uid(), 'faturamento'::app_role) OR
    has_role(auth.uid(), 'portaria'::app_role)
  );

-- Inserção apenas via SECURITY DEFINER functions (triggers)
-- Nenhuma policy de INSERT para usuários normais
-- Nenhuma policy de UPDATE ou DELETE (imutável)

-- Função helper para registrar auditoria
CREATE OR REPLACE FUNCTION public.log_audit(
  _entity_type text,
  _entity_id text,
  _action text,
  _changes jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _email text;
BEGIN
  SELECT email INTO _email FROM public.profiles WHERE id = auth.uid();
  INSERT INTO public.audit_log (entity_type, entity_id, action, user_id, user_email, changes)
  VALUES (_entity_type, _entity_id, _action, auth.uid(), COALESCE(_email, ''), _changes);
END;
$$;

-- Trigger para carregamentos_dia
CREATE OR REPLACE FUNCTION public.audit_carregamentos()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    -- Registrar apenas campos que mudaram
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
    -- Se nenhum campo relevante mudou, não registrar
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
$$;

CREATE TRIGGER trg_audit_carregamentos
  AFTER INSERT OR UPDATE OR DELETE ON public.carregamentos_dia
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_carregamentos();

-- Trigger para movimentacoes_portaria
CREATE OR REPLACE FUNCTION public.audit_movimentacoes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    IF OLD.numero_lacre IS DISTINCT FROM NEW.numero_lacre THEN
      _changes := _changes || jsonb_build_object('numero_lacre', jsonb_build_object('de', OLD.numero_lacre, 'para', NEW.numero_lacre));
    END IF;
    IF OLD.observacoes IS DISTINCT FROM NEW.observacoes THEN
      _changes := _changes || jsonb_build_object('observacoes', jsonb_build_object('de', OLD.observacoes, 'para', NEW.observacoes));
    END IF;
    IF _changes = '{}'::jsonb THEN RETURN NEW; END IF;
  ELSIF TG_OP = 'DELETE' THEN
    _action := 'excluido';
    _changes := jsonb_build_object('excluido', jsonb_build_object('tipo', OLD.tipo_movimento, 'placa', OLD.placa));
  END IF;

  INSERT INTO public.audit_log (entity_type, entity_id, action, user_id, user_email, changes)
  VALUES ('movimentacao', COALESCE(NEW.id, OLD.id)::text, _action, auth.uid(), COALESCE(_email, ''), _changes);

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_audit_movimentacoes
  AFTER INSERT OR UPDATE OR DELETE ON public.movimentacoes_portaria
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_movimentacoes();
