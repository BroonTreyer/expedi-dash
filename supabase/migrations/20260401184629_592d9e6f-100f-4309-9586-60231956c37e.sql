-- Performance indexes for 25+ concurrent users
CREATE INDEX IF NOT EXISTS idx_carregamentos_dia_data ON public.carregamentos_dia (data);
CREATE INDEX IF NOT EXISTS idx_carregamentos_dia_carga_id ON public.carregamentos_dia (carga_id) WHERE carga_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_carregamentos_dia_status ON public.carregamentos_dia (status);
CREATE INDEX IF NOT EXISTS idx_clientes_codigo ON public.clientes (codigo_cliente);
CREATE INDEX IF NOT EXISTS idx_produtos_codigo ON public.produtos (codigo_produto);
CREATE INDEX IF NOT EXISTS idx_vendedores_codigo ON public.vendedores (codigo_vendedor);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_data_hora ON public.movimentacoes_portaria (data_hora DESC);
CREATE INDEX IF NOT EXISTS idx_veiculos_esperados_data ON public.veiculos_esperados (data_referencia);