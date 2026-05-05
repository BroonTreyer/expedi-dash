
-- 1. Repointar caminhoes dos duplicados para os mantidos
UPDATE public.caminhoes SET motorista_id = 'd785c44c-f7e6-459d-8835-1ce25b81a79a'
  WHERE motorista_id = 'e3e0e956-9777-4d0e-b4d1-4aa78e9d8a34';
UPDATE public.caminhoes SET motorista_id = '1f36581f-6c4f-4137-98fc-af90d7a6d1d2'
  WHERE motorista_id = '73536f47-5ca6-49cf-a142-5c87cb52296f';

-- 2. Desativar duplicados
UPDATE public.motoristas SET ativo = false
  WHERE id IN ('e3e0e956-9777-4d0e-b4d1-4aa78e9d8a34','73536f47-5ca6-49cf-a142-5c87cb52296f');

-- 3. Índices únicos parciais
CREATE UNIQUE INDEX IF NOT EXISTS motoristas_cpf_ativo_unique
  ON public.motoristas (cpf)
  WHERE cpf IS NOT NULL AND ativo = true;

CREATE UNIQUE INDEX IF NOT EXISTS motoristas_nome_ativo_unique
  ON public.motoristas (lower(btrim(nome_completo)))
  WHERE ativo = true;
