
CREATE OR REPLACE FUNCTION public.validate_horarios_ordem()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_tol_seg int := 60; -- 60s tolerância p/ relógios não sincronizados
BEGIN
  -- horario_entrada nunca antes de horario_chegada
  IF NEW.horario_entrada IS NOT NULL AND NEW.horario_chegada IS NOT NULL
     AND NEW.horario_entrada < NEW.horario_chegada - make_interval(secs => v_tol_seg) THEN
    RAISE EXCEPTION 'Horário de entrada (%) não pode ser anterior ao horário de chegada (%).', NEW.horario_entrada, NEW.horario_chegada;
  END IF;

  -- horario_real_saida >= horario_chegada (e >= horario_entrada)
  IF NEW.horario_real_saida IS NOT NULL THEN
    IF NEW.horario_chegada IS NOT NULL
       AND NEW.horario_real_saida < NEW.horario_chegada - make_interval(secs => v_tol_seg) THEN
      RAISE EXCEPTION 'Horário de saída (%) não pode ser anterior à chegada (%).', NEW.horario_real_saida, NEW.horario_chegada;
    END IF;
    IF NEW.horario_entrada IS NOT NULL
       AND NEW.horario_real_saida < NEW.horario_entrada - make_interval(secs => v_tol_seg) THEN
      RAISE EXCEPTION 'Horário de saída (%) não pode ser anterior à entrada no pátio (%).', NEW.horario_real_saida, NEW.horario_entrada;
    END IF;
  END IF;

  -- horario_real_retorno >= horario_real_saida
  IF NEW.horario_real_retorno IS NOT NULL AND NEW.horario_real_saida IS NOT NULL
     AND NEW.horario_real_retorno < NEW.horario_real_saida - make_interval(secs => v_tol_seg) THEN
    RAISE EXCEPTION 'Horário de retorno (%) não pode ser anterior à saída para rota (%).', NEW.horario_real_retorno, NEW.horario_real_saida;
  END IF;

  -- horario_saida_final >= todos os anteriores
  IF NEW.horario_saida_final IS NOT NULL THEN
    IF NEW.horario_chegada IS NOT NULL
       AND NEW.horario_saida_final < NEW.horario_chegada - make_interval(secs => v_tol_seg) THEN
      RAISE EXCEPTION 'Horário de saída final (%) não pode ser anterior à chegada (%).', NEW.horario_saida_final, NEW.horario_chegada;
    END IF;
    IF NEW.horario_real_retorno IS NOT NULL
       AND NEW.horario_saida_final < NEW.horario_real_retorno - make_interval(secs => v_tol_seg) THEN
      RAISE EXCEPTION 'Horário de saída final (%) não pode ser anterior ao retorno (%).', NEW.horario_saida_final, NEW.horario_real_retorno;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_horarios_ordem ON public.movimentacoes_portaria;
CREATE TRIGGER trg_validate_horarios_ordem
BEFORE INSERT OR UPDATE ON public.movimentacoes_portaria
FOR EACH ROW
EXECUTE FUNCTION public.validate_horarios_ordem();
