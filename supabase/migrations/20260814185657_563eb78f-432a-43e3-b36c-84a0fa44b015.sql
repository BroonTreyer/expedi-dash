CREATE OR REPLACE FUNCTION public.on_carga_fechada()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  _grupo text;
  _existing_id uuid;
  _existing_placa text;
  _walkin_id uuid;
BEGIN
  IF OLD.etapa IN ('vendas','pre_carga')
     AND NEW.etapa = 'logistica'
     AND NEW.carga_id IS NOT NULL THEN
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
    ELSIF _existing_id IS NOT NULL THEN
      UPDATE public.veiculos_esperados
      SET placa = COALESCE(NULLIF(trim(NEW.placa), ''), placa),
          motorista = COALESCE(motorista, NEW.motorista),
          transportadora = COALESCE(transportadora, NEW.transportadora),
          tipo_veiculo = COALESCE(tipo_veiculo, NEW.tipo_caminhao)
      WHERE id = _existing_id;
    ELSIF NEW.placa IS NOT NULL AND trim(NEW.placa) <> '' THEN
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

    -- Propaga o carga_id para o movimento de entrada em aberto da mesma placa.
    -- Agora também cobre veiculos que JA entraram no patio (horario_entrada
    -- preenchido) e janela de 3 dias, evitando que a portaria abra um processo
    -- paralelo para o mesmo caminhao.
    IF NEW.placa IS NOT NULL THEN
      UPDATE public.movimentacoes_portaria
      SET carga_id = NEW.carga_id
      WHERE upper(trim(placa)) = upper(trim(NEW.placa))
        AND tipo_movimento = 'entrada'
        AND horario_saida_final IS NULL
        AND horario_real_saida IS NULL
        AND COALESCE(etapa_terceirizado, '') <> 'finalizado'
        AND COALESCE(etapa_carga_propria, '') NOT IN ('finalizado','em_rota','retornou')
        AND carga_id IS NULL
        AND data_hora > now() - interval '3 days';
    END IF;
  END IF;

  IF OLD.ruptura = false AND NEW.ruptura = true THEN
    PERFORM notify_role('faturamento', 'Ruptura registrada', 'Ruptura no pedido ' || COALESCE(NEW.numero_pedido::text, '') || ' - ' || COALESCE(NEW.nome_produto, ''), 'ruptura', 'carregamento', NEW.id::text);
    PERFORM notify_role('admin', 'Ruptura registrada', 'Ruptura no pedido ' || COALESCE(NEW.numero_pedido::text, '') || ' - ' || COALESCE(NEW.nome_produto, ''), 'ruptura', 'carregamento', NEW.id::text);
  END IF;

  RETURN NEW;
END;
$function$;