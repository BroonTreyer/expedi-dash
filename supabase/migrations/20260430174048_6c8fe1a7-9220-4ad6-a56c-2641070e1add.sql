-- Limpa chegada órfã do JOSE RIDEKS (UIW2H75) que ficou pendurada às 16:51 de 30/04/2026
-- O ciclo correto da carga HEBERT (chegada 17:18 → saída 17:30) está intacto.
DELETE FROM public.movimentacoes_portaria
WHERE id = '09c88a02-dc55-4669-bd19-f8465e60b6e6'
  AND horario_entrada IS NULL
  AND carga_id IS NULL
  AND placa = 'UIW2H75';