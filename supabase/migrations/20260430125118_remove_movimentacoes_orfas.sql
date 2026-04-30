-- Remove movimentos de "saida" órfãos (sem entrada correspondente / sem horários)
-- que estavam causando status "Expedido" indevido nos painéis de Portaria/Expedição.
--
-- Casos identificados:
--  1) FAGNO (placa QWE1B20, carga "JR"): saida criada hoje sem horario_chegada,
--     sem horario_entrada e sem etapa. Última entrada real foi em 27/04 e já
--     está finalizada.
--  2) SINOMAR (placa SUZ0E27): saida sem carga_id criada 1 minuto após uma
--     entrada que já foi finalizada hoje.

DELETE FROM public.movimentacoes_portaria
WHERE id IN (
  '292abd8e-8900-48ac-97b6-685fd7874fe4',
  '8768b164-ac59-424e-b0b8-29727a3d59b6'
);
