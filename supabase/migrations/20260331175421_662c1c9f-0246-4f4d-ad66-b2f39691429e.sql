ALTER TABLE movimentacoes_portaria 
  ADD COLUMN horario_chegada timestamptz,
  ADD COLUMN horario_entrada timestamptz,
  ADD COLUMN etapa_terceirizado text;