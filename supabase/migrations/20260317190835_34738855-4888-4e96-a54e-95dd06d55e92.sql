
-- Índices de performance na carregamentos_dia
CREATE INDEX IF NOT EXISTS idx_carregamentos_data ON public.carregamentos_dia (data);
CREATE INDEX IF NOT EXISTS idx_carregamentos_data_status ON public.carregamentos_dia (data, status);
CREATE INDEX IF NOT EXISTS idx_carregamentos_vendedor ON public.carregamentos_dia (vendedor_id);
CREATE INDEX IF NOT EXISTS idx_carregamentos_carga ON public.carregamentos_dia (carga_id);
CREATE INDEX IF NOT EXISTS idx_carregamentos_etapa ON public.carregamentos_dia (etapa);
CREATE INDEX IF NOT EXISTS idx_carregamentos_ruptura ON public.carregamentos_dia (data, ruptura) WHERE ruptura = true;
CREATE INDEX IF NOT EXISTS idx_carregamentos_cliente ON public.carregamentos_dia (codigo_cliente);
CREATE INDEX IF NOT EXISTS idx_carregamentos_created ON public.carregamentos_dia (created_at);

-- Índices auxiliares nas tabelas de cadastro
CREATE INDEX IF NOT EXISTS idx_vendedores_ativo ON public.vendedores (ativo);
CREATE INDEX IF NOT EXISTS idx_clientes_ativo ON public.clientes (ativo);
CREATE INDEX IF NOT EXISTS idx_produtos_ativo ON public.produtos (ativo);
CREATE INDEX IF NOT EXISTS idx_clientes_uf ON public.clientes (uf);
CREATE INDEX IF NOT EXISTS idx_clientes_codigo ON public.clientes (codigo_cliente);
CREATE INDEX IF NOT EXISTS idx_produtos_codigo ON public.produtos (codigo_produto);

-- Foreign keys para integridade referencial
ALTER TABLE public.carregamentos_dia
  ADD CONSTRAINT fk_carregamentos_codigo_produto
  FOREIGN KEY (codigo_produto) REFERENCES public.produtos(codigo_produto)
  ON DELETE SET NULL ON UPDATE CASCADE
  DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE public.carregamentos_dia
  ADD CONSTRAINT fk_carregamentos_codigo_cliente
  FOREIGN KEY (codigo_cliente) REFERENCES public.clientes(codigo_cliente)
  ON DELETE SET NULL ON UPDATE CASCADE
  DEFERRABLE INITIALLY DEFERRED;

-- Trigger updated_at na carregamentos_dia
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_carregamentos_dia_updated_at'
  ) THEN
    CREATE TRIGGER update_carregamentos_dia_updated_at
      BEFORE UPDATE ON public.carregamentos_dia
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END;
$$;
