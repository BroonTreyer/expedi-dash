-- Torna o gatilho de vínculo tardio idempotente: quando 7 linhas da mesma carga
-- são atualizadas em paralelo (fechamento de pré-carga), o trigger antes
-- tentava INSERT 7x no mesmo veiculos_esperados e a trava única
-- (veiculos_esperados_carga_id_unique_previsto) abortava o lote.
-- Agora respeita ON CONFLICT DO NOTHING, igual ao on_carga_fechada.
CREATE OR REPLACE FUNCTION public.vincular_veiculo_esperado_tardio()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _existing_id uuid;
  _existing_placa text;
  _grupo text;
BEGIN
  IF NEW.etapa = 'logistica'
     AND NEW.carga_id IS NOT NULL
     AND NEW.placa IS NOT NULL
     AND (OLD.placa IS NULL OR OLD.placa = '' OR OLD.placa IS DISTINCT FROM NEW.placa) THEN

    SELECT id, placa INTO _existing_id, _existing_placa
    FROM public.veiculos_esperados
    WHERE carga_id = NEW.carga_id
      AND status_autorizacao <> 'recusado'
      AND conferido = false
    ORDER BY created_at DESC
    LIMIT 1;

    IF _existing_id IS NOT NULL
       AND upper(trim(COALESCE(_existing_placa, ''))) <> upper(trim(NEW.placa)) THEN
      UPDATE public.veiculos_esperados
      SET placa = NEW.placa,
          motorista = NEW.motorista,
          transportadora = NEW.transportadora,
          tipo_veiculo = COALESCE(NEW.tipo_caminhao, tipo_veiculo)
      WHERE id = _existing_id;
    ELSIF _existing_id IS NULL THEN
      _grupo := CASE
        WHEN NEW.transportadora IS NOT NULL AND NEW.transportadora <> '' THEN 'TERCEIRIZADO'
        ELSE 'PRÓPRIA'
      END;
      INSERT INTO public.veiculos_esperados (
        data_referencia, grupo, placa, motorista, transportadora,
        tipo_veiculo, carga_id, status_autorizacao, walk_in
      ) VALUES (
        COALESCE(NEW.data, CURRENT_DATE), _grupo, NEW.placa, NEW.motorista, NEW.transportadora,
        NEW.tipo_caminhao, NEW.carga_id, 'previsto', false
      )
      ON CONFLICT DO NOTHING;
    END IF;

    UPDATE public.movimentacoes_portaria
    SET carga_id = NEW.carga_id
    WHERE upper(trim(placa)) = upper(trim(NEW.placa))
      AND tipo_movimento = 'entrada'
      AND horario_entrada IS NULL
      AND carga_id IS NULL
      AND data_hora > now() - interval '7 days';
  END IF;
  RETURN NEW;
END;
$function$;