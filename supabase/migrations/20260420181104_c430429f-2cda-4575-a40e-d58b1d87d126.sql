CREATE OR REPLACE FUNCTION public.on_carga_fechada()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _grupo text;
  _exists boolean;
BEGIN
  IF OLD.etapa = 'vendas' AND NEW.etapa = 'logistica' AND NEW.carga_id IS NOT NULL THEN
    -- Notificar portaria que uma carga foi fechada
    PERFORM notify_role('portaria', 'Carga fechada', 'Carga ' || COALESCE(NEW.nome_carga, NEW.carga_id) || ' foi fechada e está pronta para expedição', 'carga_fechada', 'carregamento', NEW.carga_id);
    -- Notificar logística também
    PERFORM notify_role('logistica', 'Carga fechada', 'Carga ' || COALESCE(NEW.nome_carga, NEW.carga_id) || ' foi fechada', 'carga_fechada', 'carregamento', NEW.carga_id);

    -- Se não houver veículo esperado para esta carga, criar um automaticamente
    SELECT EXISTS(SELECT 1 FROM public.veiculos_esperados WHERE carga_id = NEW.carga_id) INTO _exists;
    IF NOT _exists AND NEW.placa IS NOT NULL THEN
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
      );
    END IF;
  END IF;
  
  -- Quando ruptura é marcada, notifica faturamento
  IF OLD.ruptura = false AND NEW.ruptura = true THEN
    PERFORM notify_role('faturamento', 'Ruptura registrada', 'Ruptura no pedido ' || COALESCE(NEW.numero_pedido::text, '') || ' - ' || COALESCE(NEW.nome_produto, ''), 'ruptura', 'carregamento', NEW.id::text);
    PERFORM notify_role('admin', 'Ruptura registrada', 'Ruptura no pedido ' || COALESCE(NEW.numero_pedido::text, '') || ' - ' || COALESCE(NEW.nome_produto, ''), 'ruptura', 'carregamento', NEW.id::text);
  END IF;
  
  RETURN NEW;
END;
$function$;