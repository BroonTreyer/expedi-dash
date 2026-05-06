CREATE OR REPLACE FUNCTION public.on_carga_fechada()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _grupo text;
  _existing_id uuid;
  _existing_placa text;
  _walkin_id uuid;
BEGIN
  IF OLD.etapa = 'vendas' AND NEW.etapa = 'logistica' AND NEW.carga_id IS NOT NULL THEN
    PERFORM notify_role('portaria', 'Carga fechada', 'Carga ' || COALESCE(NEW.nome_carga, NEW.carga_id) || ' foi fechada e está pronta para expedição', 'carga_fechada', 'carregamento', NEW.carga_id);
    PERFORM notify_role('logistica', 'Carga fechada', 'Carga ' || COALESCE(NEW.nome_carga, NEW.carga_id) || ' foi fechada', 'carga_fechada', 'carregamento', NEW.carga_id);

    SELECT id, placa INTO _existing_id, _existing_placa
    FROM public.veiculos_esperados
    WHERE carga_id = NEW.carga_id
      AND status_autorizacao <> 'recusado'
      AND conferido = false
    ORDER BY created_at DESC
    LIMIT 1;

    IF NEW.placa IS NOT NULL THEN
      SELECT id INTO _walkin_id
      FROM public.veiculos_esperados
      WHERE upper(trim(placa)) = upper(trim(NEW.placa))
        AND walk_in = true
        AND status_autorizacao IN ('aguardando_vinculo','aguardando_autorizacao','autorizado')
        AND conferido = false
        AND created_at > now() - interval '7 days'
      ORDER BY created_at DESC
      LIMIT 1;
    END IF;

    IF _walkin_id IS NOT NULL THEN
      UPDATE public.veiculos_esperados
      SET carga_id = NEW.carga_id,
          status_autorizacao = 'autorizado',
          autorizado_em = COALESCE(autorizado_em, now()),
          motorista = COALESCE(motorista, NEW.motorista),
          transportadora = COALESCE(transportadora, NEW.transportadora),
          tipo_veiculo = COALESCE(tipo_veiculo, NEW.tipo_caminhao)
      WHERE id = _walkin_id;
    ELSIF _existing_id IS NOT NULL AND NEW.placa IS NOT NULL
          AND upper(trim(COALESCE(_existing_placa, ''))) <> upper(trim(NEW.placa)) THEN
      UPDATE public.veiculos_esperados
      SET placa = NEW.placa,
          motorista = NEW.motorista,
          transportadora = NEW.transportadora,
          tipo_veiculo = COALESCE(NEW.tipo_caminhao, tipo_veiculo)
      WHERE id = _existing_id;
    ELSIF _existing_id IS NULL AND NEW.placa IS NOT NULL THEN
      _grupo := CASE
        WHEN NEW.transportadora IS NOT NULL AND NEW.transportadora <> '' THEN 'TERCEIRIZADO'
        ELSE 'PRÓPRIA'
      END;
      INSERT INTO public.veiculos_esperados (
        data_referencia, grupo, placa, motorista, transportadora,
        tipo_veiculo, carga_id, status_autorizacao, walk_in
      ) VALUES (
        CURRENT_DATE, _grupo, NEW.placa, NEW.motorista, NEW.transportadora,
        NEW.tipo_caminhao, NEW.carga_id, 'previsto', false
      )
      ON CONFLICT DO NOTHING;
    END IF;

    -- Propaga carga_id para a movimentação de chegada órfã correspondente
    -- (mesma placa, sem carga_id e ainda não liberada). Sem isso, o painel
    -- "Cargas fechadas aguardando veículo" mostra o card azul indevidamente.
    IF NEW.placa IS NOT NULL THEN
      UPDATE public.movimentacoes_portaria
      SET carga_id = NEW.carga_id
      WHERE upper(trim(placa)) = upper(trim(NEW.placa))
        AND tipo_movimento = 'entrada'
        AND horario_entrada IS NULL
        AND carga_id IS NULL
        AND data_hora > now() - interval '7 days';
    END IF;
  END IF;

  IF OLD.ruptura = false AND NEW.ruptura = true THEN
    PERFORM notify_role('faturamento', 'Ruptura registrada', 'Ruptura no pedido ' || COALESCE(NEW.numero_pedido::text, '') || ' - ' || COALESCE(NEW.nome_produto, ''), 'ruptura', 'carregamento', NEW.id::text);
    PERFORM notify_role('admin', 'Ruptura registrada', 'Ruptura no pedido ' || COALESCE(NEW.numero_pedido::text, '') || ' - ' || COALESCE(NEW.nome_produto, ''), 'ruptura', 'carregamento', NEW.id::text);
  END IF;

  RETURN NEW;
END;
$function$;

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
      );
    END IF;

    -- Propaga carga_id para a chegada órfã correspondente.
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

-- Backfill dos órfãos atuais.
UPDATE public.movimentacoes_portaria m
SET carga_id = c.carga_id
FROM (
  SELECT DISTINCT ON (upper(trim(placa))) carga_id, upper(trim(placa)) AS placa_norm, data
  FROM public.carregamentos_dia
  WHERE etapa = 'logistica'
    AND carga_id IS NOT NULL
    AND placa IS NOT NULL
    AND data > CURRENT_DATE - interval '14 days'
  ORDER BY upper(trim(placa)), data DESC
) c
WHERE m.tipo_movimento = 'entrada'
  AND m.horario_entrada IS NULL
  AND m.carga_id IS NULL
  AND m.placa IS NOT NULL
  AND upper(trim(m.placa)) = c.placa_norm
  AND m.data_hora >= (c.data::timestamp - interval '12 hours')
  AND m.data_hora <= (c.data::timestamp + interval '48 hours');