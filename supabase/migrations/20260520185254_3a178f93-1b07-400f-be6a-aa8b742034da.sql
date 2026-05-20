
-- ============ CADASTROS ============
CREATE TABLE public.fornecedores_mp (
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
CREATE INDEX idx_fornecedores_mp_nome ON public.fornecedores_mp (lower(nome));

CREATE TABLE public.produtos_mp (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text,
  nome text NOT NULL,
  unidade_padrao text NOT NULL DEFAULT 'ton',
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_produtos_mp_nome ON public.produtos_mp (lower(nome));

-- ============ RECEBIMENTOS ============
CREATE TABLE public.recebimentos_mp (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recibo_numero text UNIQUE,
  data_chegada date NOT NULL DEFAULT CURRENT_DATE,
  hora_chegada time,
  data_recebimento date,
  data_descarga date,
  motorista text,
  telefone text,
  cpf text,
  placa text,
  tipo_veiculo text,
  fornecedor_id uuid,
  fornecedor_nome text,
  conferente text,
  doca_setor text,
  pallets_quantidade integer DEFAULT 0,
  pallets_devolvidos boolean DEFAULT false,
  peso_total_ton numeric NOT NULL DEFAULT 0,
  valor_tonelada numeric NOT NULL DEFAULT 35.00,
  valor_total numeric NOT NULL DEFAULT 0,
  forma_pagamento text,
  pagamento_status text NOT NULL DEFAULT 'pendente',
  pago_em timestamptz,
  pago_por uuid,
  comprovante_url text,
  foto_nota_url text,
  status_geral text NOT NULL DEFAULT 'aguardando_descarga',
  observacoes text,
  vinculo_movimentacao_portaria_id uuid,
  criado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_recebimentos_mp_data ON public.recebimentos_mp (data_chegada DESC);
CREATE INDEX idx_recebimentos_mp_status ON public.recebimentos_mp (status_geral);
CREATE INDEX idx_recebimentos_mp_placa ON public.recebimentos_mp (upper(placa));

CREATE TABLE public.recebimentos_mp_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recebimento_id uuid NOT NULL,
  produto_id uuid,
  nome_produto text NOT NULL,
  nota_fiscal text,
  peso_ton numeric NOT NULL DEFAULT 0,
  valor_unitario numeric NOT NULL DEFAULT 35.00,
  valor_total_linha numeric NOT NULL DEFAULT 0,
  ordem integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_rec_mp_itens_recebimento ON public.recebimentos_mp_itens (recebimento_id);

-- ============ NUMERAÇÃO DE RECIBO ============
CREATE OR REPLACE FUNCTION public.next_recibo_mp(_data date)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _prefix text := 'RECMP-' || to_char(_data, 'YYYYMMDD') || '-';
  _next int;
BEGIN
  SELECT COALESCE(MAX((regexp_replace(recibo_numero, '^.*-', ''))::int), 0) + 1
    INTO _next
  FROM public.recebimentos_mp
  WHERE recibo_numero LIKE _prefix || '%';
  RETURN _prefix || lpad(_next::text, 3, '0');
END;
$$;

CREATE OR REPLACE FUNCTION public.set_recibo_mp_numero()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.recibo_numero IS NULL THEN
    NEW.recibo_numero := public.next_recibo_mp(NEW.data_chegada);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_set_recibo_mp_numero
BEFORE INSERT ON public.recebimentos_mp
FOR EACH ROW EXECUTE FUNCTION public.set_recibo_mp_numero();

-- ============ RECÁLCULO DE TOTAIS ============
CREATE OR REPLACE FUNCTION public.recalc_recebimento_mp_total()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _rid uuid := COALESCE(NEW.recebimento_id, OLD.recebimento_id);
  _peso numeric;
  _valor numeric;
BEGIN
  SELECT COALESCE(SUM(peso_ton), 0),
         COALESCE(SUM(peso_ton * valor_unitario), 0)
    INTO _peso, _valor
  FROM public.recebimentos_mp_itens
  WHERE recebimento_id = _rid;

  UPDATE public.recebimentos_mp
  SET peso_total_ton = _peso,
      valor_total = _valor,
      updated_at = now()
  WHERE id = _rid;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_recalc_recebimento_mp_total
AFTER INSERT OR UPDATE OR DELETE ON public.recebimentos_mp_itens
FOR EACH ROW EXECUTE FUNCTION public.recalc_recebimento_mp_total();

-- Recalcula total_linha do item
CREATE OR REPLACE FUNCTION public.set_recebimento_mp_item_total()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.valor_total_linha := COALESCE(NEW.peso_ton, 0) * COALESCE(NEW.valor_unitario, 0);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_set_recebimento_mp_item_total
BEFORE INSERT OR UPDATE ON public.recebimentos_mp_itens
FOR EACH ROW EXECUTE FUNCTION public.set_recebimento_mp_item_total();

-- ============ NOTIFICAÇÃO FATURAMENTO ============
CREATE OR REPLACE FUNCTION public.notify_recebimento_mp_aguardando_pagamento()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.status_geral IS DISTINCT FROM NEW.status_geral
      AND NEW.status_geral = 'aguardando_pagamento') THEN
    PERFORM notify_role(
      'faturamento',
      'Recebimento aguardando pagamento',
      'Recibo ' || COALESCE(NEW.recibo_numero, '') || ' — ' ||
        COALESCE(NEW.fornecedor_nome, '') || ' (R$ ' ||
        to_char(NEW.valor_total, 'FM999G999G990D00') || ')',
      'recebimento_mp_pagamento',
      'recebimento_mp',
      NEW.id::text
    );
    PERFORM notify_role(
      'admin',
      'Recebimento aguardando pagamento',
      'Recibo ' || COALESCE(NEW.recibo_numero, '') || ' — ' ||
        COALESCE(NEW.fornecedor_nome, ''),
      'recebimento_mp_pagamento',
      'recebimento_mp',
      NEW.id::text
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_recebimento_mp
AFTER UPDATE ON public.recebimentos_mp
FOR EACH ROW EXECUTE FUNCTION public.notify_recebimento_mp_aguardando_pagamento();

-- ============ updated_at ============
CREATE TRIGGER trg_fornecedores_mp_updated BEFORE UPDATE ON public.fornecedores_mp
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_produtos_mp_updated BEFORE UPDATE ON public.produtos_mp
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_recebimentos_mp_updated BEFORE UPDATE ON public.recebimentos_mp
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_recebimentos_mp_itens_updated BEFORE UPDATE ON public.recebimentos_mp_itens
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ AUDITORIA ============
CREATE TRIGGER trg_audit_fornecedores_mp
AFTER INSERT OR UPDATE OR DELETE ON public.fornecedores_mp
FOR EACH ROW EXECUTE FUNCTION public.audit_generic_cadastro('fornecedor_mp');

CREATE TRIGGER trg_audit_produtos_mp
AFTER INSERT OR UPDATE OR DELETE ON public.produtos_mp
FOR EACH ROW EXECUTE FUNCTION public.audit_generic_cadastro('produto_mp');

CREATE TRIGGER trg_audit_recebimentos_mp
AFTER INSERT OR UPDATE OR DELETE ON public.recebimentos_mp
FOR EACH ROW EXECUTE FUNCTION public.audit_generic_cadastro('recebimento_mp');

-- ============ RLS ============
ALTER TABLE public.fornecedores_mp ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos_mp ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recebimentos_mp ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recebimentos_mp_itens ENABLE ROW LEVEL SECURITY;

-- Fornecedores MP
CREATE POLICY "Auth select fornecedores_mp" ON public.fornecedores_mp
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Ops insert fornecedores_mp" ON public.fornecedores_mp
  FOR INSERT TO authenticated WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'logistica'::app_role) OR
    has_role(auth.uid(), 'faturamento'::app_role) OR
    has_role(auth.uid(), 'portaria'::app_role)
  );
CREATE POLICY "Ops update fornecedores_mp" ON public.fornecedores_mp
  FOR UPDATE TO authenticated USING (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'logistica'::app_role) OR
    has_role(auth.uid(), 'faturamento'::app_role)
  );
CREATE POLICY "Admin delete fornecedores_mp" ON public.fornecedores_mp
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Produtos MP
CREATE POLICY "Auth select produtos_mp" ON public.produtos_mp
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Ops insert produtos_mp" ON public.produtos_mp
  FOR INSERT TO authenticated WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'logistica'::app_role) OR
    has_role(auth.uid(), 'faturamento'::app_role) OR
    has_role(auth.uid(), 'portaria'::app_role)
  );
CREATE POLICY "Ops update produtos_mp" ON public.produtos_mp
  FOR UPDATE TO authenticated USING (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'logistica'::app_role) OR
    has_role(auth.uid(), 'faturamento'::app_role)
  );
CREATE POLICY "Admin delete produtos_mp" ON public.produtos_mp
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Recebimentos MP
CREATE POLICY "Ops select recebimentos_mp" ON public.recebimentos_mp
  FOR SELECT TO authenticated USING (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'logistica'::app_role) OR
    has_role(auth.uid(), 'portaria'::app_role) OR
    has_role(auth.uid(), 'faturamento'::app_role)
  );
CREATE POLICY "Ops insert recebimentos_mp" ON public.recebimentos_mp
  FOR INSERT TO authenticated WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'logistica'::app_role) OR
    has_role(auth.uid(), 'portaria'::app_role)
  );
CREATE POLICY "Ops update recebimentos_mp" ON public.recebimentos_mp
  FOR UPDATE TO authenticated USING (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'logistica'::app_role) OR
    has_role(auth.uid(), 'portaria'::app_role) OR
    has_role(auth.uid(), 'faturamento'::app_role)
  );
CREATE POLICY "Admin delete recebimentos_mp" ON public.recebimentos_mp
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Itens
CREATE POLICY "Ops select recebimentos_mp_itens" ON public.recebimentos_mp_itens
  FOR SELECT TO authenticated USING (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'logistica'::app_role) OR
    has_role(auth.uid(), 'portaria'::app_role) OR
    has_role(auth.uid(), 'faturamento'::app_role)
  );
CREATE POLICY "Ops insert recebimentos_mp_itens" ON public.recebimentos_mp_itens
  FOR INSERT TO authenticated WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'logistica'::app_role) OR
    has_role(auth.uid(), 'portaria'::app_role)
  );
CREATE POLICY "Ops update recebimentos_mp_itens" ON public.recebimentos_mp_itens
  FOR UPDATE TO authenticated USING (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'logistica'::app_role) OR
    has_role(auth.uid(), 'portaria'::app_role)
  );
CREATE POLICY "Ops delete recebimentos_mp_itens" ON public.recebimentos_mp_itens
  FOR DELETE TO authenticated USING (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'logistica'::app_role) OR
    has_role(auth.uid(), 'portaria'::app_role)
  );

-- ============ STORAGE ============
INSERT INTO storage.buckets (id, name, public)
VALUES ('recebimento-mp', 'recebimento-mp', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Ops select recebimento-mp objects"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'recebimento-mp' AND (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'logistica'::app_role) OR
    has_role(auth.uid(), 'portaria'::app_role) OR
    has_role(auth.uid(), 'faturamento'::app_role)
  )
);
CREATE POLICY "Ops insert recebimento-mp objects"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'recebimento-mp' AND (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'logistica'::app_role) OR
    has_role(auth.uid(), 'portaria'::app_role) OR
    has_role(auth.uid(), 'faturamento'::app_role)
  )
);
CREATE POLICY "Ops update recebimento-mp objects"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'recebimento-mp' AND (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'logistica'::app_role) OR
    has_role(auth.uid(), 'faturamento'::app_role)
  )
);
CREATE POLICY "Admin delete recebimento-mp objects"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'recebimento-mp' AND has_role(auth.uid(), 'admin'::app_role));

-- ============ REALTIME ============
ALTER PUBLICATION supabase_realtime ADD TABLE public.recebimentos_mp;
ALTER PUBLICATION supabase_realtime ADD TABLE public.recebimentos_mp_itens;
