
-- Tabela de notificações
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'info',
  entity_type text,
  entity_id text,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Cada usuário só vê suas próprias notificações
CREATE POLICY "Users read own notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Cada usuário pode marcar como lida
CREATE POLICY "Users update own notifications"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Sistema insere via trigger (SECURITY DEFINER functions)
CREATE POLICY "System insert notifications"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Usuário pode deletar suas próprias
CREATE POLICY "Users delete own notifications"
  ON public.notifications FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Habilitar realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Função para notificar usuários por role
CREATE OR REPLACE FUNCTION public.notify_role(_role app_role, _title text, _message text, _type text DEFAULT 'info', _entity_type text DEFAULT NULL, _entity_id text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, title, message, type, entity_type, entity_id)
  SELECT ur.user_id, _title, _message, _type, _entity_type, _entity_id
  FROM public.user_roles ur
  WHERE ur.role = _role;
END;
$$;

-- Trigger: quando carga é fechada (etapa muda para 'logistica'), notifica portaria
CREATE OR REPLACE FUNCTION public.on_carga_fechada()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.etapa = 'vendas' AND NEW.etapa = 'logistica' AND NEW.carga_id IS NOT NULL THEN
    -- Notificar portaria que uma carga foi fechada
    PERFORM notify_role('portaria', 'Carga fechada', 'Carga ' || COALESCE(NEW.nome_carga, NEW.carga_id) || ' foi fechada e está pronta para expedição', 'carga_fechada', 'carregamento', NEW.carga_id);
    -- Notificar logística também
    PERFORM notify_role('logistica', 'Carga fechada', 'Carga ' || COALESCE(NEW.nome_carga, NEW.carga_id) || ' foi fechada', 'carga_fechada', 'carregamento', NEW.carga_id);
  END IF;
  
  -- Quando ruptura é marcada, notifica faturamento
  IF OLD.ruptura = false AND NEW.ruptura = true THEN
    PERFORM notify_role('faturamento', 'Ruptura registrada', 'Ruptura no pedido ' || COALESCE(NEW.numero_pedido::text, '') || ' - ' || COALESCE(NEW.nome_produto, ''), 'ruptura', 'carregamento', NEW.id::text);
    PERFORM notify_role('admin', 'Ruptura registrada', 'Ruptura no pedido ' || COALESCE(NEW.numero_pedido::text, '') || ' - ' || COALESCE(NEW.nome_produto, ''), 'ruptura', 'carregamento', NEW.id::text);
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_carga_fechada
  AFTER UPDATE ON public.carregamentos_dia
  FOR EACH ROW
  EXECUTE FUNCTION public.on_carga_fechada();

-- Trigger: quando veículo esperado é conferido (chegou), notifica logística
CREATE OR REPLACE FUNCTION public.on_veiculo_chegou()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.conferido = false AND NEW.conferido = true THEN
    PERFORM notify_role('logistica', 'Veículo chegou', 'Veículo ' || NEW.placa || COALESCE(' (' || NEW.motorista || ')', '') || ' chegou e foi conferido', 'veiculo_chegou', 'veiculo_esperado', NEW.id::text);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_veiculo_chegou
  AFTER UPDATE ON public.veiculos_esperados
  FOR EACH ROW
  EXECUTE FUNCTION public.on_veiculo_chegou();

-- Trigger: quando movimentação de entrada é criada, notifica logística
CREATE OR REPLACE FUNCTION public.on_entrada_portaria()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.tipo_movimento = 'entrada' THEN
    PERFORM notify_role('logistica', 'Entrada na portaria', COALESCE(NEW.categoria, 'Veículo') || ' - Placa ' || COALESCE(NEW.placa, 'N/I') || ' entrou na portaria', 'entrada_portaria', 'movimentacao', NEW.id::text);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_entrada_portaria
  AFTER INSERT ON public.movimentacoes_portaria
  FOR EACH ROW
  EXECUTE FUNCTION public.on_entrada_portaria();
