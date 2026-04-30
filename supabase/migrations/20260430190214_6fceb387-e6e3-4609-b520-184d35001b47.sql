-- 1) Remove triggers duplicados em veiculos_esperados (mantém os com prefixo trg_on_*)
DROP TRIGGER IF EXISTS trg_veiculo_chegou ON public.veiculos_esperados;
DROP TRIGGER IF EXISTS trg_walkin_status_change ON public.veiculos_esperados;

-- 2) Corrige etapa dos registros finalizados pelo admin (estavam em 'saida' em vez de 'finalizado')
UPDATE public.movimentacoes_portaria
SET etapa_terceirizado = 'finalizado'
WHERE etapa_terceirizado = 'saida'
  AND categoria = 'terceirizado'
  AND observacoes ILIKE '%pelo admin%';

-- 3) Cria veiculo_esperado faltante para a carga histórica EDIVAR + VANESSA
INSERT INTO public.veiculos_esperados (
  data_referencia, grupo, placa, motorista, transportadora,
  tipo_veiculo, carga_id, status_autorizacao, walk_in
)
SELECT
  CURRENT_DATE,
  'TERCEIRIZADO',
  MAX(placa),
  MAX(motorista),
  MAX(transportadora),
  MAX(tipo_caminhao),
  'EDIVAR + VANESSA',
  'previsto',
  false
FROM public.carregamentos_dia
WHERE carga_id = 'EDIVAR + VANESSA'
  AND placa IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.veiculos_esperados WHERE carga_id = 'EDIVAR + VANESSA'
  );