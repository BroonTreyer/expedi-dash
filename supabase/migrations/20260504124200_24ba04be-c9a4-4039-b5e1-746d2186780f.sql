-- Onda 4 / E3: normaliza legado CP. Desabilita temporariamente o trigger de
-- ordem cronológica (introduzido na Onda 3) durante o UPDATE em massa, pois
-- alguns registros legados têm horários fora de ordem de origem desconhecida —
-- o objetivo aqui é apenas trocar tipo_movimento, não corrigir cronologia.
ALTER TABLE public.movimentacoes_portaria DISABLE TRIGGER trg_validate_horarios_ordem;

UPDATE public.movimentacoes_portaria
SET tipo_movimento = 'entrada',
    horario_entrada = COALESCE(horario_entrada, horario_chegada, data_hora)
WHERE categoria = 'carga_propria'
  AND tipo_movimento = 'saida';

ALTER TABLE public.movimentacoes_portaria ENABLE TRIGGER trg_validate_horarios_ordem;