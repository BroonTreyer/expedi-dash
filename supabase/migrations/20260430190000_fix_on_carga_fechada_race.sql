-- Fix race condition no trigger on_carga_fechada quando carga tem multiplos itens
CREATE OR REPLACE FUNCTION public.on_carga_fechada()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _grupo text;
  _exists boolean;
  _walkin_id uuid;
BEGIN
  IF OLD.etapa = 'vendas' AND NEW.etapa = 'logistica' AND NEW.carga_id IS NOT NULL THEN
    PERFORM notify_role('portaria', 'Carga fechada', 'Carga ' || COALESCE(NEW.nome_carga, NEW.carga_id) || ' foi fechada e está pronta para expedição', 'carga_fechada', 'carregamento', NEW.carga_id);
    PERFORM notify_role('logistica', 'Carga fechada', 'Carga ' || COALESCE(NEW.nome_carga, NEW.carga_id) || ' foi fechada', 'carga_fechada', 'carregamento', NEW.carga_id);

    -- Lock por carga para evitar corrida entre multiplos itens
    PERFORM pg_advisory_xact_lock(hashtext('carga_fechada:' || NEW.carga_id));

    SELECT EXISTS(SELECT 1 FROM public.veiculos_esperados WHERE carga_id = NEW.carga_id) INTO _exists;

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
    ELSIF NOT _exists AND NEW.placa IS NOT NULL THEN
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
      ON CONFLICT (carga_id) WHERE walk_in = false DO NOTHING;
    END IF;
  END IF;

  IF OLD.ruptura = false AND NEW.ruptura = true THEN
    PERFORM notify_role('faturamento', 'Ruptura registrada', 'Ruptura no pedido ' || COALESCE(NEW.numero_pedido::text, '') || ' - ' || COALESCE(NEW.nome_produto, ''), 'ruptura', 'carregamento', NEW.id::text);
    PERFORM notify_role('admin', 'Ruptura registrada', 'Ruptura no pedido ' || COALESCE(NEW.numero_pedido::text, '') || ' - ' || COALESCE(NEW.nome_produto, ''), 'ruptura', 'carregamento', NEW.id::text);
  END IF;

  RETURN NEW;
END;
$function$;
