
-- =========================================================
-- 1) SNAPSHOT DE SEGURANÇA antes de apagar dados de MP
-- =========================================================
INSERT INTO public.data_snapshots (description, record_counts, snapshot_data)
SELECT
  'Pré-refatoração Recebimento MP (' || to_char(now(), 'YYYY-MM-DD HH24:MI') || ')',
  jsonb_build_object(
    'recebimentos_mp', (SELECT count(*) FROM public.recebimentos_mp),
    'recebimentos_mp_itens', (SELECT count(*) FROM public.recebimentos_mp_itens),
    'fornecedores_mp', (SELECT count(*) FROM public.fornecedores_mp),
    'produtos_mp', (SELECT count(*) FROM public.produtos_mp)
  ),
  jsonb_build_object(
    'recebimentos_mp', COALESCE((SELECT jsonb_agg(to_jsonb(r)) FROM public.recebimentos_mp r), '[]'::jsonb),
    'recebimentos_mp_itens', COALESCE((SELECT jsonb_agg(to_jsonb(r)) FROM public.recebimentos_mp_itens r), '[]'::jsonb),
    'fornecedores_mp', COALESCE((SELECT jsonb_agg(to_jsonb(r)) FROM public.fornecedores_mp r), '[]'::jsonb),
    'produtos_mp', COALESCE((SELECT jsonb_agg(to_jsonb(r)) FROM public.produtos_mp r), '[]'::jsonb)
  );

-- =========================================================
-- 2) DROP tabelas antigas
-- =========================================================
DROP TABLE IF EXISTS public.recebimentos_mp_itens CASCADE;
DROP TABLE IF EXISTS public.recebimentos_mp CASCADE;
DROP TABLE IF EXISTS public.fornecedores_mp CASCADE;
DROP TABLE IF EXISTS public.produtos_mp CASCADE;

-- =========================================================
-- 3) FORNECEDORES MP
-- =========================================================
CREATE TABLE public.mp_fornecedores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  cnpj_cpf text,
  telefone text,
  email text,
  cidade text,
  uf text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_mp_fornecedores_nome ON public.mp_fornecedores (lower(nome));
ALTER TABLE public.mp_fornecedores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth select mp_fornecedores" ON public.mp_fornecedores
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Ops insert mp_fornecedores" ON public.mp_fornecedores
  FOR INSERT TO authenticated WITH CHECK (
    has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'logistica'::app_role)
    OR has_role(auth.uid(),'faturamento'::app_role) OR has_role(auth.uid(),'portaria'::app_role)
  );
CREATE POLICY "Ops update mp_fornecedores" ON public.mp_fornecedores
  FOR UPDATE TO authenticated USING (
    has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'logistica'::app_role)
    OR has_role(auth.uid(),'faturamento'::app_role)
  );
CREATE POLICY "Admin delete mp_fornecedores" ON public.mp_fornecedores
  FOR DELETE TO authenticated USING (has_role(auth.uid(),'admin'::app_role));

-- =========================================================
-- 4) PRODUTOS MP (com categoria + preço de referência)
-- =========================================================
CREATE TABLE public.mp_produtos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text,
  nome text NOT NULL,
  categoria text,
  unidade_padrao text NOT NULL DEFAULT 'ton',
  preco_referencia_ton numeric NOT NULL DEFAULT 35.00,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_mp_produtos_nome ON public.mp_produtos (lower(nome));
CREATE INDEX idx_mp_produtos_categoria ON public.mp_produtos (categoria);
ALTER TABLE public.mp_produtos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth select mp_produtos" ON public.mp_produtos
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Ops insert mp_produtos" ON public.mp_produtos
  FOR INSERT TO authenticated WITH CHECK (
    has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'logistica'::app_role)
    OR has_role(auth.uid(),'faturamento'::app_role) OR has_role(auth.uid(),'portaria'::app_role)
  );
CREATE POLICY "Ops update mp_produtos" ON public.mp_produtos
  FOR UPDATE TO authenticated USING (
    has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'logistica'::app_role)
    OR has_role(auth.uid(),'faturamento'::app_role)
  );
CREATE POLICY "Admin delete mp_produtos" ON public.mp_produtos
  FOR DELETE TO authenticated USING (has_role(auth.uid(),'admin'::app_role));

-- =========================================================
-- 5) RECEBIMENTOS MP (cabeçalho)
-- =========================================================
CREATE TABLE public.mp_recebimentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recibo_numero text UNIQUE,
  data_chegada date NOT NULL DEFAULT CURRENT_DATE,
  hora_chegada time,
  data_descarga date,
  data_recebimento date,
  fornecedor_id uuid REFERENCES public.mp_fornecedores(id) ON DELETE SET NULL,
  fornecedor_nome text,
  motorista text,
  telefone text,
  cpf text,
  placa text,
  tipo_veiculo text,
  conferente text,
  doca_setor text,
  pallets_quantidade integer DEFAULT 0,
  pallets_devolvidos boolean DEFAULT false,
  peso_total_ton numeric NOT NULL DEFAULT 0,
  valor_total numeric NOT NULL DEFAULT 0,
  forma_pagamento text,
  pagamento_status text NOT NULL DEFAULT 'pendente',
  pago_em timestamptz,
  pago_por uuid,
  comprovante_url text,
  foto_nota_url text,
  status_geral text NOT NULL DEFAULT 'aguardando_descarga',
  mes_fechado boolean NOT NULL DEFAULT false,
  observacoes text,
  criado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_mp_receb_data ON public.mp_recebimentos (data_chegada DESC);
CREATE INDEX idx_mp_receb_forn_data ON public.mp_recebimentos (fornecedor_id, data_chegada DESC);
CREATE INDEX idx_mp_receb_status ON public.mp_recebimentos (pagamento_status);
CREATE INDEX idx_mp_receb_status_geral ON public.mp_recebimentos (status_geral);
ALTER TABLE public.mp_recebimentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ops select mp_recebimentos" ON public.mp_recebimentos
  FOR SELECT TO authenticated USING (
    has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'logistica'::app_role)
    OR has_role(auth.uid(),'portaria'::app_role) OR has_role(auth.uid(),'faturamento'::app_role)
  );
CREATE POLICY "Ops insert mp_recebimentos" ON public.mp_recebimentos
  FOR INSERT TO authenticated WITH CHECK (
    has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'logistica'::app_role)
    OR has_role(auth.uid(),'portaria'::app_role)
  );
CREATE POLICY "Ops update mp_recebimentos" ON public.mp_recebimentos
  FOR UPDATE TO authenticated USING (
    has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'logistica'::app_role)
    OR has_role(auth.uid(),'portaria'::app_role) OR has_role(auth.uid(),'faturamento'::app_role)
  );
CREATE POLICY "Admin delete mp_recebimentos" ON public.mp_recebimentos
  FOR DELETE TO authenticated USING (has_role(auth.uid(),'admin'::app_role));

-- =========================================================
-- 6) ITENS DO RECEBIMENTO
-- =========================================================
CREATE TABLE public.mp_recebimento_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recebimento_id uuid NOT NULL REFERENCES public.mp_recebimentos(id) ON DELETE CASCADE,
  produto_id uuid REFERENCES public.mp_produtos(id) ON DELETE SET NULL,
  nome_produto text NOT NULL,
  categoria text,
  nota_fiscal text,
  peso_ton numeric NOT NULL DEFAULT 0,
  valor_unitario_ton numeric NOT NULL DEFAULT 35.00,
  valor_total_linha numeric NOT NULL DEFAULT 0,
  peso_confirmado boolean NOT NULL DEFAULT false,
  ordem integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_mp_itens_receb ON public.mp_recebimento_itens (recebimento_id);
CREATE INDEX idx_mp_itens_produto ON public.mp_recebimento_itens (produto_id);
ALTER TABLE public.mp_recebimento_itens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ops select mp_itens" ON public.mp_recebimento_itens
  FOR SELECT TO authenticated USING (
    has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'logistica'::app_role)
    OR has_role(auth.uid(),'portaria'::app_role) OR has_role(auth.uid(),'faturamento'::app_role)
  );
CREATE POLICY "Ops insert mp_itens" ON public.mp_recebimento_itens
  FOR INSERT TO authenticated WITH CHECK (
    has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'logistica'::app_role)
    OR has_role(auth.uid(),'portaria'::app_role)
  );
CREATE POLICY "Ops update mp_itens" ON public.mp_recebimento_itens
  FOR UPDATE TO authenticated USING (
    has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'logistica'::app_role)
    OR has_role(auth.uid(),'portaria'::app_role)
  );
CREATE POLICY "Ops delete mp_itens" ON public.mp_recebimento_itens
  FOR DELETE TO authenticated USING (
    has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'logistica'::app_role)
    OR has_role(auth.uid(),'portaria'::app_role)
  );

-- =========================================================
-- 7) TRIGGERS
-- =========================================================

-- 7.1 updated_at
CREATE TRIGGER trg_mp_fornecedores_updated BEFORE UPDATE ON public.mp_fornecedores
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_mp_produtos_updated BEFORE UPDATE ON public.mp_produtos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_mp_recebimentos_updated BEFORE UPDATE ON public.mp_recebimentos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_mp_itens_updated BEFORE UPDATE ON public.mp_recebimento_itens
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 7.2 Recibo número sequencial
CREATE OR REPLACE FUNCTION public.mp_next_recibo(_data date)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  _prefix text := 'RECMP-' || to_char(_data, 'YYYYMMDD') || '-';
  _next int;
BEGIN
  SELECT COALESCE(MAX( (regexp_replace(recibo_numero, '^.*-', ''))::int ), 0) + 1
    INTO _next
  FROM public.mp_recebimentos
  WHERE recibo_numero LIKE _prefix || '%';
  RETURN _prefix || lpad(_next::text, 3, '0');
END;
$$;

CREATE OR REPLACE FUNCTION public.mp_set_recibo_numero()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.recibo_numero IS NULL THEN
    NEW.recibo_numero := public.mp_next_recibo(NEW.data_chegada);
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_mp_set_recibo BEFORE INSERT ON public.mp_recebimentos
  FOR EACH ROW EXECUTE FUNCTION public.mp_set_recibo_numero();

-- 7.3 Calcula valor_total_linha em itens
CREATE OR REPLACE FUNCTION public.mp_set_item_total()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  NEW.valor_total_linha := COALESCE(NEW.peso_ton,0) * COALESCE(NEW.valor_unitario_ton,0);
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_mp_item_total BEFORE INSERT OR UPDATE ON public.mp_recebimento_itens
  FOR EACH ROW EXECUTE FUNCTION public.mp_set_item_total();

-- 7.4 Anti-erro kg/ton: peso > 100 ton só com peso_confirmado=true
CREATE OR REPLACE FUNCTION public.mp_validate_peso_item()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.peso_ton > 100 AND NEW.peso_confirmado IS NOT TRUE THEN
    RAISE EXCEPTION 'Peso %.3f ton parece estar em kg. Confirme marcando peso_confirmado=true se realmente são toneladas.', NEW.peso_ton;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_mp_validate_peso BEFORE INSERT OR UPDATE ON public.mp_recebimento_itens
  FOR EACH ROW EXECUTE FUNCTION public.mp_validate_peso_item();

-- 7.5 Recalcula totais no cabeçalho a partir dos itens
CREATE OR REPLACE FUNCTION public.mp_recalc_recebimento()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  _rid uuid := COALESCE(NEW.recebimento_id, OLD.recebimento_id);
  _peso numeric;
  _valor numeric;
BEGIN
  SELECT COALESCE(SUM(peso_ton),0),
         COALESCE(SUM(peso_ton * valor_unitario_ton),0)
    INTO _peso, _valor
  FROM public.mp_recebimento_itens
  WHERE recebimento_id = _rid;

  UPDATE public.mp_recebimentos
  SET peso_total_ton = _peso,
      valor_total = _valor,
      updated_at = now()
  WHERE id = _rid;
  RETURN COALESCE(NEW, OLD);
END;
$$;
CREATE TRIGGER trg_mp_recalc_after_itens
  AFTER INSERT OR UPDATE OR DELETE ON public.mp_recebimento_itens
  FOR EACH ROW EXECUTE FUNCTION public.mp_recalc_recebimento();

-- 7.6 Bloqueia edição de recebimento de mês fechado (exceto admin)
CREATE OR REPLACE FUNCTION public.mp_block_mes_fechado()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.mes_fechado = true AND NOT public.has_role(auth.uid(),'admin'::app_role) THEN
    -- Permite só alterações de pagamento
    IF NEW.data_chegada IS DISTINCT FROM OLD.data_chegada
       OR NEW.peso_total_ton IS DISTINCT FROM OLD.peso_total_ton
       OR NEW.valor_total IS DISTINCT FROM OLD.valor_total
       OR NEW.mes_fechado IS DISTINCT FROM OLD.mes_fechado THEN
      RAISE EXCEPTION 'Recebimento pertence a mês fechado. Somente admins podem alterar.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_mp_block_mes_fechado BEFORE UPDATE ON public.mp_recebimentos
  FOR EACH ROW EXECUTE FUNCTION public.mp_block_mes_fechado();

-- =========================================================
-- 8) REALTIME
-- =========================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.mp_recebimentos;
ALTER PUBLICATION supabase_realtime ADD TABLE public.mp_recebimento_itens;
ALTER TABLE public.mp_recebimentos REPLICA IDENTITY FULL;
ALTER TABLE public.mp_recebimento_itens REPLICA IDENTITY FULL;

-- =========================================================
-- 9) VIEWS DE ANÁLISE
-- =========================================================

-- 9.1 Compras mensais por produto
CREATE OR REPLACE VIEW public.mp_compras_mensal_produto AS
SELECT
  date_trunc('month', r.data_chegada)::date AS mes,
  extract(year from r.data_chegada)::int AS ano,
  extract(month from r.data_chegada)::int AS mes_num,
  i.produto_id,
  COALESCE(p.nome, i.nome_produto) AS produto_nome,
  COALESCE(p.categoria, i.categoria) AS categoria,
  SUM(i.peso_ton) AS ton,
  SUM(i.valor_total_linha) AS valor,
  COUNT(DISTINCT r.id) AS qtd_descargas,
  COUNT(DISTINCT r.fornecedor_id) AS qtd_fornecedores,
  CASE WHEN SUM(i.peso_ton) > 0
       THEN SUM(i.valor_total_linha) / SUM(i.peso_ton)
       ELSE 0 END AS preco_medio_ton
FROM public.mp_recebimento_itens i
JOIN public.mp_recebimentos r ON r.id = i.recebimento_id
LEFT JOIN public.mp_produtos p ON p.id = i.produto_id
GROUP BY 1,2,3,4,5,6;

-- 9.2 Evolução de preço por produto (diária)
CREATE OR REPLACE VIEW public.mp_evolucao_preco_produto AS
SELECT
  r.data_chegada AS dia,
  i.produto_id,
  COALESCE(p.nome, i.nome_produto) AS produto_nome,
  AVG(i.valor_unitario_ton) AS preco_medio_ton,
  MIN(i.valor_unitario_ton) AS preco_min_ton,
  MAX(i.valor_unitario_ton) AS preco_max_ton,
  SUM(i.peso_ton) AS ton,
  COUNT(*) AS linhas
FROM public.mp_recebimento_itens i
JOIN public.mp_recebimentos r ON r.id = i.recebimento_id
LEFT JOIN public.mp_produtos p ON p.id = i.produto_id
GROUP BY r.data_chegada, i.produto_id, COALESCE(p.nome, i.nome_produto);

-- 9.3 Fechamento mensal por fornecedor
CREATE OR REPLACE VIEW public.mp_fechamento_fornecedor AS
SELECT
  date_trunc('month', r.data_chegada)::date AS mes,
  r.fornecedor_id,
  r.fornecedor_nome,
  COUNT(*) AS qtd_recebimentos,
  SUM(r.peso_total_ton) AS ton,
  SUM(r.valor_total) AS valor,
  SUM(CASE WHEN r.pagamento_status = 'pago' THEN r.valor_total ELSE 0 END) AS valor_pago,
  SUM(CASE WHEN r.pagamento_status = 'pendente' THEN r.valor_total ELSE 0 END) AS valor_pendente
FROM public.mp_recebimentos r
GROUP BY 1,2,3;

-- Permissões nas views (herda da tabela base; só garantir grant explícito)
GRANT SELECT ON public.mp_compras_mensal_produto TO authenticated;
GRANT SELECT ON public.mp_evolucao_preco_produto TO authenticated;
GRANT SELECT ON public.mp_fechamento_fornecedor TO authenticated;

-- =========================================================
-- 10) Notificação de aguardando pagamento (mantém comportamento atual)
-- =========================================================
CREATE OR REPLACE FUNCTION public.mp_notify_aguardando_pagamento()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status_geral IS DISTINCT FROM NEW.status_geral
     AND NEW.status_geral = 'aguardando_pagamento' THEN
    PERFORM public.notify_role('faturamento','Recebimento aguardando pagamento',
      'Recibo ' || COALESCE(NEW.recibo_numero,'') || ' — ' || COALESCE(NEW.fornecedor_nome,'') ||
      ' (R$ ' || to_char(NEW.valor_total,'FM999G999G990D00') || ')',
      'mp_pagamento','mp_recebimento', NEW.id::text);
    PERFORM public.notify_role('admin','Recebimento aguardando pagamento',
      'Recibo ' || COALESCE(NEW.recibo_numero,'') || ' — ' || COALESCE(NEW.fornecedor_nome,''),
      'mp_pagamento','mp_recebimento', NEW.id::text);
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_mp_notify_pagamento AFTER UPDATE ON public.mp_recebimentos
  FOR EACH ROW EXECUTE FUNCTION public.mp_notify_aguardando_pagamento();
