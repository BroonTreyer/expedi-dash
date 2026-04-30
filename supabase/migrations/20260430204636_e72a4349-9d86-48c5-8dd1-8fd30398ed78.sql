
-- 1) Limpa 15 registros "fantasmas": movimentos com etapa=finalizado mas sem horario_saida_final
UPDATE public.movimentacoes_portaria
SET horario_saida_final = COALESCE(horario_saida_final, now())
WHERE (etapa_terceirizado = 'finalizado'
       OR etapa_carga_propria IN ('em_rota', 'retornou', 'finalizado'))
  AND horario_saida_final IS NULL;

-- 2) Trigger preventivo: se a etapa virar finalizada e horario_saida_final
-- ainda estiver nulo, carimba automaticamente.
CREATE OR REPLACE FUNCTION public.set_horario_saida_on_finalizado()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.horario_saida_final IS NULL
     AND (
       NEW.etapa_terceirizado = 'finalizado'
       OR NEW.etapa_carga_propria IN ('em_rota', 'retornou', 'finalizado')
     ) THEN
    NEW.horario_saida_final := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_horario_saida_on_finalizado ON public.movimentacoes_portaria;
CREATE TRIGGER trg_set_horario_saida_on_finalizado
BEFORE INSERT OR UPDATE ON public.movimentacoes_portaria
FOR EACH ROW
EXECUTE FUNCTION public.set_horario_saida_on_finalizado();
