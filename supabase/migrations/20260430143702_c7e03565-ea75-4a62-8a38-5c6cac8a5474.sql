INSERT INTO public.movimentacoes_portaria (
  tipo_movimento,
  categoria,
  placa,
  motorista,
  carga_id,
  etapa_terceirizado,
  horario_chegada,
  data_hora,
  observacoes
)
SELECT
  'entrada',
  'terceirizado',
  ve.placa,
  ve.motorista,
  ve.carga_id,
  'chegada',
  ve.created_at,
  ve.created_at,
  'Backfill: registro de chegada criado retroativamente'
FROM public.veiculos_esperados ve
WHERE ve.walk_in = true
  AND ve.status_autorizacao IN ('aguardando_vinculo','autorizado')
  AND ve.conferido = false
  AND ve.created_at > now() - interval '7 days'
  AND NOT EXISTS (
    SELECT 1 FROM public.movimentacoes_portaria mp
    WHERE upper(trim(mp.placa)) = upper(trim(ve.placa))
      AND mp.created_at >= ve.created_at - interval '5 minutes'
      AND mp.created_at <= ve.created_at + interval '1 day'
      AND mp.tipo_movimento = 'entrada'
  );