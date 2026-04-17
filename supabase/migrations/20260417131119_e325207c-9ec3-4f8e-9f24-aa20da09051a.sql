CREATE OR REPLACE FUNCTION public.on_walkin_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status_autorizacao IN ('aguardando_autorizacao', 'aguardando_vinculo') THEN
      PERFORM notify_role(
        'logistica',
        'Veículo no pátio',
        'Veículo ' || NEW.placa || COALESCE(' (' || NEW.motorista || ')', '') || ' aguardando vínculo de carga',
        'walkin_pendente',
        'veiculo_esperado',
        NEW.id::text
      );
      PERFORM notify_role(
        'admin',
        'Veículo no pátio',
        'Veículo ' || NEW.placa || COALESCE(' (' || NEW.motorista || ')', '') || ' aguardando vínculo de carga',
        'walkin_pendente',
        'veiculo_esperado',
        NEW.id::text
      );
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status_autorizacao IS DISTINCT FROM NEW.status_autorizacao THEN
      IF NEW.status_autorizacao = 'autorizado' THEN
        PERFORM notify_role(
          'portaria',
          'Veículo liberado',
          'Veículo ' || NEW.placa || ' vinculado a carga e liberado para entrada',
          'walkin_autorizado',
          'veiculo_esperado',
          NEW.id::text
        );
      ELSIF NEW.status_autorizacao = 'recusado' THEN
        PERFORM notify_role(
          'portaria',
          'Entrada recusada',
          'Veículo ' || NEW.placa || ' teve entrada recusada' || COALESCE(' - ' || NEW.motivo_recusa, ''),
          'walkin_recusado',
          'veiculo_esperado',
          NEW.id::text
        );
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;