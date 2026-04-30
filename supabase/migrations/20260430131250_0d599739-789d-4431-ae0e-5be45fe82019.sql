UPDATE public.movimentacoes_portaria
SET etapa_terceirizado = 'finalizado',
    horario_real_saida = COALESCE(horario_real_saida, horario_entrada, data_hora),
    observacoes = COALESCE(observacoes, '') ||
      CASE WHEN observacoes IS NULL OR observacoes = '' THEN '' ELSE E'\n' END ||
      '[REGULARIZADO automaticamente: entrada antiga sem saída registrada, superada por ciclo posterior já finalizado]'
WHERE id IN (
  '2f0bed02-5e12-4fbd-815d-7baa8ca9e659',
  '8e68e4f4-40cc-40b9-a2fd-485835fe99f5'
);