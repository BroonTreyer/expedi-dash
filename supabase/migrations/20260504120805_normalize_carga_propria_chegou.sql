-- Normaliza registros de Carga Própria que ficaram em "aguardando_liberacao"
-- (estado antigo) para "chegou", já preenchendo horario_entrada.
UPDATE public.movimentacoes_portaria
SET etapa_carga_propria = 'chegou',
    horario_entrada = COALESCE(horario_entrada, horario_chegada, data_hora)
WHERE categoria = 'carga_propria'
  AND tipo_movimento = 'entrada'
  AND etapa_carga_propria = 'aguardando_liberacao';
