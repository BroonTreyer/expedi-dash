UPDATE public.movimentacoes_portaria
SET horario_saida_final = now(),
    horario_real_saida = COALESCE(horario_real_saida, now()),
    etapa_terceirizado = 'finalizado'
WHERE id = '9c47876f-09e3-4b5f-8ff2-1a027ba536cd';