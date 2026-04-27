-- =============================================================
-- Painel do Vendedor - Modo operacional
-- =============================================================

-- 1) Vendedor cria pedidos próprios (somente em rascunho ou aguardando_faturamento)
CREATE POLICY "Vendedor insere proprios pedidos"
  ON public.carregamentos_dia
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'vendedor')
    AND vendedor_id = public.get_my_vendedor_id()
    AND etapa IN ('rascunho','aguardando_faturamento')
  );

-- 2) Vendedor edita só rascunhos próprios; mantém vendedor_id e etapa restritos
CREATE POLICY "Vendedor altera rascunhos"
  ON public.carregamentos_dia
  FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'vendedor')
    AND vendedor_id = public.get_my_vendedor_id()
    AND etapa IN ('rascunho','aguardando_faturamento')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'vendedor')
    AND vendedor_id = public.get_my_vendedor_id()
    AND etapa IN ('rascunho','aguardando_faturamento')
  );

-- 3) Vendedor exclui apenas rascunhos próprios
CREATE POLICY "Vendedor exclui rascunhos"
  ON public.carregamentos_dia
  FOR DELETE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'vendedor')
    AND vendedor_id = public.get_my_vendedor_id()
    AND etapa = 'rascunho'
  );

-- 4) Vendedor cadastra clientes novos quando precisar (não pode editar/excluir)
CREATE POLICY "Vendedor insere clientes"
  ON public.clientes
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'vendedor'));

-- 5) Índice para acelerar a fila de aprovações do faturamento
CREATE INDEX IF NOT EXISTS idx_carregamentos_etapa_aguardando
  ON public.carregamentos_dia (etapa)
  WHERE etapa = 'aguardando_faturamento';

-- 6) Notificações para faturamento quando vendedor envia pedido
CREATE OR REPLACE FUNCTION public.on_pedido_enviado_aprovacao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _nome_vendedor text;
BEGIN
  IF NEW.etapa = 'aguardando_faturamento'
     AND (TG_OP = 'INSERT' OR OLD.etapa IS DISTINCT FROM NEW.etapa) THEN
    SELECT nome_vendedor INTO _nome_vendedor FROM public.vendedores WHERE id = NEW.vendedor_id;
    PERFORM public.notify_role(
      'faturamento',
      'Novo pedido para aprovação',
      'Vendedor ' || COALESCE(_nome_vendedor, 'desconhecido') || ' enviou pedido ' ||
        COALESCE(NEW.cliente, '') || ' (' || COALESCE(NEW.nome_produto, '') || ')',
      'pedido_aprovacao',
      'carregamento',
      NEW.id::text
    );
    PERFORM public.notify_role(
      'admin',
      'Novo pedido para aprovação',
      'Vendedor ' || COALESCE(_nome_vendedor, 'desconhecido') || ' enviou pedido ' ||
        COALESCE(NEW.cliente, '') || ' (' || COALESCE(NEW.nome_produto, '') || ')',
      'pedido_aprovacao',
      'carregamento',
      NEW.id::text
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pedido_enviado_aprovacao ON public.carregamentos_dia;
CREATE TRIGGER trg_pedido_enviado_aprovacao
  AFTER INSERT OR UPDATE OF etapa ON public.carregamentos_dia
  FOR EACH ROW EXECUTE FUNCTION public.on_pedido_enviado_aprovacao();

-- 7) Notificar vendedor quando pedido for aprovado/rejeitado
CREATE OR REPLACE FUNCTION public.on_pedido_aprovado_rejeitado()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid;
BEGIN
  IF NEW.vendedor_id IS NULL THEN RETURN NEW; END IF;
  IF OLD.etapa = 'aguardando_faturamento' AND NEW.etapa = 'vendas' THEN
    SELECT user_id INTO _user_id FROM public.vendedor_users WHERE vendedor_id = NEW.vendedor_id;
    IF _user_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, title, message, type, entity_type, entity_id)
      VALUES (
        _user_id,
        'Pedido aprovado',
        'Pedido para ' || COALESCE(NEW.cliente, '') || ' (' || COALESCE(NEW.nome_produto, '') || ') foi aprovado pelo faturamento.',
        'pedido_aprovado',
        'carregamento',
        NEW.id::text
      );
    END IF;
  ELSIF OLD.etapa = 'aguardando_faturamento' AND NEW.etapa = 'rascunho' THEN
    SELECT user_id INTO _user_id FROM public.vendedor_users WHERE vendedor_id = NEW.vendedor_id;
    IF _user_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, title, message, type, entity_type, entity_id)
      VALUES (
        _user_id,
        'Pedido devolvido',
        'Faturamento devolveu o pedido para ajustes' ||
          CASE WHEN NEW.observacoes IS NOT NULL AND NEW.observacoes <> '' THEN ': ' || NEW.observacoes ELSE '.' END,
        'pedido_rejeitado',
        'carregamento',
        NEW.id::text
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pedido_aprovado_rejeitado ON public.carregamentos_dia;
CREATE TRIGGER trg_pedido_aprovado_rejeitado
  AFTER UPDATE OF etapa ON public.carregamentos_dia
  FOR EACH ROW EXECUTE FUNCTION public.on_pedido_aprovado_rejeitado();