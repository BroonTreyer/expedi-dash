
INSERT INTO public.carregamentos_dia (
  id, data, etapa, status, vendedor_id, codigo_cliente, cliente, cidade, uf,
  codigo_produto, nome_produto, quantidade, peso, quantidade_original, peso_original,
  peso_manual, tipo_frete, ruptura, ruptura_sinalizada, numero_pedido, created_at, updated_at
) VALUES
(
  '82d3c85a-e644-4815-87ad-99c44ecb8cb0', '2026-04-28', 'vendas', 'Aguardando',
  '63241c8e-f812-477c-8625-3189e3e9a7e0', '33175', 'FRIGORSUL TRANSPORTES E DISTRIBUIDORA DE',
  'Ubatã', 'BA', '2600', 'LING SUINA FINA APIMENTADA CL 4x4,5kg',
  56, 1008, 56, 1008, true, 'FOB', false, false, 13, now(), now()
),
(
  'accab9b5-64a6-4825-a7c6-7916f31df59b', '2026-04-28', 'vendas', 'Aguardando',
  '63241c8e-f812-477c-8625-3189e3e9a7e0', '33175', 'FRIGORSUL TRANSPORTES E DISTRIBUIDORA DE',
  'Ubatã', 'BA', '301', 'LINGUIÇA TOSCANA MISTA 4x5kg',
  50, 1000, 50, 1000, true, 'FOB', false, false, 13, now(), now()
)
ON CONFLICT (id) DO NOTHING;
