
-- ============================================================
-- ONDA 1 — Carga Própria: correções críticas (A2, A6, A1 trigger)
-- ============================================================

-- A6: trigger só preenche horario_saida_final quando etapa final = 'finalizado'
-- (remove ramos 'em_rota' e 'retornou' que estavam fechando o ciclo cedo demais)
CREATE OR REPLACE FUNCTION public.set_horario_saida_on_finalizado()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  IF NEW.horario_saida_final IS NULL
     AND (
       NEW.etapa_terceirizado = 'finalizado'
       OR NEW.etapa_carga_propria = 'finalizado'
     ) THEN
    NEW.horario_saida_final := now();
  END IF;
  RETURN NEW;
END;
$function$;

-- A2: normaliza 18 registros com estado impossível
-- (tipo_movimento='saida' + etapa_carga_propria='chegou')
-- Critério: se tem horario_saida_final ou km_final, vira 'finalizado'.
-- Senão, normaliza para entrada+chegou (estado real do pátio).
UPDATE public.movimentacoes_portaria
SET tipo_movimento = 'entrada',
    etapa_carga_propria = CASE
      WHEN horario_saida_final IS NOT NULL OR km_final IS NOT NULL THEN 'finalizado'
      ELSE 'chegou'
    END,
    horario_entrada = COALESCE(horario_entrada, horario_chegada, data_hora)
WHERE categoria = 'carga_propria'
  AND tipo_movimento = 'saida'
  AND etapa_carga_propria = 'chegou';

-- A1 (defesa em profundidade): trigger valida km_rodado antes de gravar
-- Bloqueia negativos e valores absurdos (>3000 km diferença numa única operação).
CREATE OR REPLACE FUNCTION public.validate_km_rodado()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  IF NEW.km_inicial IS NOT NULL
     AND NEW.km_final IS NOT NULL
     AND NEW.km_final < NEW.km_inicial THEN
    RAISE EXCEPTION 'KM Final (%) não pode ser menor que KM Inicial (%)',
      NEW.km_final, NEW.km_inicial;
  END IF;

  IF NEW.km_inicial IS NOT NULL
     AND NEW.km_final IS NOT NULL
     AND (NEW.km_final - NEW.km_inicial) > 3000 THEN
    RAISE EXCEPTION 'Diferença de KM (%) excede o limite operacional de 3000 km. Verifique os valores.',
      (NEW.km_final - NEW.km_inicial);
  END IF;

  -- Recalcula km_rodado consistente
  IF NEW.km_inicial IS NOT NULL AND NEW.km_final IS NOT NULL THEN
    NEW.km_rodado := NEW.km_final - NEW.km_inicial;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS validate_km_rodado_trigger ON public.movimentacoes_portaria;
CREATE TRIGGER validate_km_rodado_trigger
BEFORE INSERT OR UPDATE OF km_inicial, km_final, km_rodado
ON public.movimentacoes_portaria
FOR EACH ROW
EXECUTE FUNCTION public.validate_km_rodado();
