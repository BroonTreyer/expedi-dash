
-- 1. Cabeçalho
CREATE TABLE public.tabelas_frete (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  descricao text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tabelas_frete ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/log select tabelas_frete" ON public.tabelas_frete
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'logistica'::app_role));

CREATE POLICY "Admin/log insert tabelas_frete" ON public.tabelas_frete
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'logistica'::app_role));

CREATE POLICY "Admin/log update tabelas_frete" ON public.tabelas_frete
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'logistica'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'logistica'::app_role));

CREATE POLICY "Admin/log delete tabelas_frete" ON public.tabelas_frete
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'logistica'::app_role));

CREATE TRIGGER trg_tabelas_frete_upd
  BEFORE UPDATE ON public.tabelas_frete
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Itens
CREATE TABLE public.tabelas_frete_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tabela_id uuid NOT NULL REFERENCES public.tabelas_frete(id) ON DELETE CASCADE,
  codigo_cliente text,
  destino_cidade text NOT NULL,
  destino_uf text NOT NULL,
  valor_kg_bitruck numeric NOT NULL DEFAULT 0,
  valor_kg_carreta numeric NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uq_tabelas_frete_itens_chave
  ON public.tabelas_frete_itens (tabela_id, COALESCE(codigo_cliente,''), lower(destino_cidade), upper(destino_uf));
CREATE INDEX idx_tab_itens_destino ON public.tabelas_frete_itens (lower(destino_cidade), upper(destino_uf));
CREATE INDEX idx_tab_itens_cliente ON public.tabelas_frete_itens (codigo_cliente);

ALTER TABLE public.tabelas_frete_itens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/log select tabelas_frete_itens" ON public.tabelas_frete_itens
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'logistica'::app_role));

CREATE POLICY "Admin/log insert tabelas_frete_itens" ON public.tabelas_frete_itens
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'logistica'::app_role));

CREATE POLICY "Admin/log update tabelas_frete_itens" ON public.tabelas_frete_itens
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'logistica'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'logistica'::app_role));

CREATE POLICY "Admin/log delete tabelas_frete_itens" ON public.tabelas_frete_itens
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'logistica'::app_role));

CREATE TRIGGER trg_tabelas_frete_itens_upd
  BEFORE UPDATE ON public.tabelas_frete_itens
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Vínculo vendedor x tabela
CREATE TABLE public.vendedor_tabelas_frete (
  vendedor_id uuid NOT NULL REFERENCES public.vendedores(id) ON DELETE CASCADE,
  tabela_id uuid NOT NULL REFERENCES public.tabelas_frete(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (vendedor_id, tabela_id)
);
CREATE INDEX idx_vtf_tabela ON public.vendedor_tabelas_frete (tabela_id);

ALTER TABLE public.vendedor_tabelas_frete ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/log select vendedor_tabelas_frete" ON public.vendedor_tabelas_frete
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'logistica'::app_role));

CREATE POLICY "Admin/log insert vendedor_tabelas_frete" ON public.vendedor_tabelas_frete
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'logistica'::app_role));

CREATE POLICY "Admin/log delete vendedor_tabelas_frete" ON public.vendedor_tabelas_frete
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'logistica'::app_role));

-- 4. Migração de dados: tarifas atuais -> tabela "Padrão"
DO $$
DECLARE
  _tab_id uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM public.tabela_frete WHERE ativo = true) THEN
    INSERT INTO public.tabelas_frete (nome, descricao)
    VALUES ('Padrão', 'Migrada automaticamente das tarifas antigas. Vincule manualmente aos vendedores.')
    RETURNING id INTO _tab_id;

    INSERT INTO public.tabelas_frete_itens
      (tabela_id, codigo_cliente, destino_cidade, destino_uf, valor_kg_bitruck, valor_kg_carreta)
    SELECT
      _tab_id,
      NULL,
      destino_cidade,
      upper(destino_uf),
      COALESCE(MAX(CASE WHEN tipo_veiculo = 'bitruck' THEN valor_kg END), 0),
      COALESCE(MAX(CASE WHEN tipo_veiculo = 'carreta' THEN valor_kg END), 0)
    FROM public.tabela_frete
    WHERE ativo = true
    GROUP BY destino_cidade, upper(destino_uf);
  END IF;
END $$;
