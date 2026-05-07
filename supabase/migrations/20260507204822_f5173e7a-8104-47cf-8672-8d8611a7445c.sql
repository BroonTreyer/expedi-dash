
-- 1. Transportadoras (cadastro financeiro)
CREATE TABLE public.transportadoras_financeiro (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE,
  codigo text,
  cnpj text,
  pix_chave text,
  pix_tipo text CHECK (pix_tipo IN ('cpf','cnpj','email','telefone','aleatoria')),
  banco text,
  agencia text,
  conta text,
  percentual_adiantamento_padrao numeric NOT NULL DEFAULT 50,
  ativo boolean NOT NULL DEFAULT true,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);
ALTER TABLE public.transportadoras_financeiro ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ops select transportadoras_financeiro" ON public.transportadoras_financeiro
  FOR SELECT TO authenticated USING (
    has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'logistica'::app_role) OR has_role(auth.uid(),'faturamento'::app_role)
  );
CREATE POLICY "Admin/log insert transportadoras_financeiro" ON public.transportadoras_financeiro
  FOR INSERT TO authenticated WITH CHECK (
    has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'logistica'::app_role)
  );
CREATE POLICY "Admin/log update transportadoras_financeiro" ON public.transportadoras_financeiro
  FOR UPDATE TO authenticated USING (
    has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'logistica'::app_role)
  ) WITH CHECK (
    has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'logistica'::app_role)
  );
CREATE POLICY "Admin delete transportadoras_financeiro" ON public.transportadoras_financeiro
  FOR DELETE TO authenticated USING (has_role(auth.uid(),'admin'::app_role));

CREATE TRIGGER trg_transp_fin_updated
  BEFORE UPDATE ON public.transportadoras_financeiro
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Adiantamentos de frete
CREATE TABLE public.adiantamentos_frete (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero text NOT NULL UNIQUE,
  transportadora text NOT NULL,
  transportadora_id uuid REFERENCES public.transportadoras_financeiro(id) ON DELETE SET NULL,
  tipo_agrupamento text NOT NULL DEFAULT 'lote' CHECK (tipo_agrupamento IN ('ordem','lote')),
  ordem_carga text,
  qtd_ctes integer NOT NULL DEFAULT 0,
  peso_total numeric NOT NULL DEFAULT 0,
  valor_total_ctes numeric NOT NULL DEFAULT 0,
  percentual numeric NOT NULL DEFAULT 50,
  valor_adiantamento numeric NOT NULL DEFAULT 0,
  valor_saldo numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','pago','quitado','cancelado')),
  pago_em timestamptz,
  pago_por uuid,
  comprovante_pagamento_url text,
  quitado_em timestamptz,
  quitado_por uuid,
  comprovante_quitacao_url text,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);
ALTER TABLE public.adiantamentos_frete ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ops select adiantamentos_frete" ON public.adiantamentos_frete
  FOR SELECT TO authenticated USING (
    has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'logistica'::app_role) OR has_role(auth.uid(),'faturamento'::app_role)
  );
CREATE POLICY "Admin/log insert adiantamentos_frete" ON public.adiantamentos_frete
  FOR INSERT TO authenticated WITH CHECK (
    has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'logistica'::app_role)
  );
CREATE POLICY "Ops update adiantamentos_frete" ON public.adiantamentos_frete
  FOR UPDATE TO authenticated USING (
    has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'logistica'::app_role) OR has_role(auth.uid(),'faturamento'::app_role)
  ) WITH CHECK (
    has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'logistica'::app_role) OR has_role(auth.uid(),'faturamento'::app_role)
  );
CREATE POLICY "Admin delete adiantamentos_frete" ON public.adiantamentos_frete
  FOR DELETE TO authenticated USING (has_role(auth.uid(),'admin'::app_role));

CREATE TRIGGER trg_adt_updated
  BEFORE UPDATE ON public.adiantamentos_frete
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_adt_status ON public.adiantamentos_frete(status);
CREATE INDEX idx_adt_transportadora ON public.adiantamentos_frete(transportadora);

-- 3. Pivot adiantamento <-> CT-es
CREATE TABLE public.adiantamentos_frete_ctes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  adiantamento_id uuid NOT NULL REFERENCES public.adiantamentos_frete(id) ON DELETE CASCADE,
  cte_id uuid NOT NULL REFERENCES public.ctes_dacte(id) ON DELETE CASCADE,
  valor_frete numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (adiantamento_id, cte_id)
);
ALTER TABLE public.adiantamentos_frete_ctes ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_adt_ctes_adt ON public.adiantamentos_frete_ctes(adiantamento_id);
CREATE INDEX idx_adt_ctes_cte ON public.adiantamentos_frete_ctes(cte_id);

CREATE POLICY "Ops select adt_ctes" ON public.adiantamentos_frete_ctes
  FOR SELECT TO authenticated USING (
    has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'logistica'::app_role) OR has_role(auth.uid(),'faturamento'::app_role)
  );
CREATE POLICY "Admin/log insert adt_ctes" ON public.adiantamentos_frete_ctes
  FOR INSERT TO authenticated WITH CHECK (
    has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'logistica'::app_role)
  );
CREATE POLICY "Admin/log delete adt_ctes" ON public.adiantamentos_frete_ctes
  FOR DELETE TO authenticated USING (
    has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'logistica'::app_role)
  );

-- 4. Função para gerar número sequencial diário ADT-YYYYMMDD-NNN
CREATE OR REPLACE FUNCTION public.next_adiantamento_numero()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _prefix text := 'ADT-' || to_char(now() AT TIME ZONE 'America/Sao_Paulo', 'YYYYMMDD') || '-';
  _next int;
BEGIN
  SELECT COALESCE(MAX( (regexp_replace(numero, '^.*-', ''))::int ), 0) + 1
    INTO _next
  FROM public.adiantamentos_frete
  WHERE numero LIKE _prefix || '%';
  RETURN _prefix || lpad(_next::text, 3, '0');
END;
$$;
