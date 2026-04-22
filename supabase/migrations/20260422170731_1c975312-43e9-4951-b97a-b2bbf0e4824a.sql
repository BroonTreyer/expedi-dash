-- Dedup completo: mantém o mais antigo por (carga_id, data_referencia) entre os ativos
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY carga_id, data_referencia
           ORDER BY 
             CASE WHEN walk_in THEN 0 ELSE 1 END,  -- prioriza walk-in (tem histórico real)
             CASE WHEN conferido THEN 0 ELSE 1 END,
             created_at ASC
         ) AS rn
  FROM public.veiculos_esperados
  WHERE carga_id IS NOT NULL
    AND status_autorizacao <> 'recusado'
)
DELETE FROM public.veiculos_esperados
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- Agora cria o índice
CREATE UNIQUE INDEX IF NOT EXISTS veiculos_esperados_carga_unique_ativo
  ON public.veiculos_esperados (carga_id, data_referencia)
  WHERE status_autorizacao <> 'recusado' AND carga_id IS NOT NULL;

-- Trigger melhorado
CREATE OR REPLACE FUNCTION public.on_carga_fechada()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _grupo text;
  _exists boolean;
  _walkin_ativo boolean;
BEGIN
  IF OLD.etapa = 'vendas' AND NEW.etapa = 'logistica' AND NEW.carga_id IS NOT NULL THEN
    PERFORM notify_role('portaria', 'Carga fechada', 'Carga ' || COALESCE(NEW.nome_carga, NEW.carga_id) || ' foi fechada e está pronta para expedição', 'carga_fechada', 'carregamento', NEW.carga_id);
    PERFORM notify_role('logistica', 'Carga fechada', 'Carga ' || COALESCE(NEW.nome_carga, NEW.carga_id) || ' foi fechada', 'carga_fechada', 'carregamento', NEW.carga_id);

    SELECT EXISTS(SELECT 1 FROM public.veiculos_esperados WHERE carga_id = NEW.carga_id) INTO _exists;

    SELECT EXISTS(
      SELECT 1 FROM public.veiculos_esperados
      WHERE placa = NEW.placa
        AND data_referencia = CURRENT_DATE
        AND walk_in = true
        AND status_autorizacao IN ('aguardando_vinculo','aguardando_autorizacao','autorizado')
    ) INTO _walkin_ativo;

    IF NOT _exists AND NOT _walkin_ativo AND NEW.placa IS NOT NULL THEN
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
  END IF;

  IF OLD.ruptura = false AND NEW.ruptura = true THEN
    PERFORM notify_role('faturamento', 'Ruptura registrada', 'Ruptura no pedido ' || COALESCE(NEW.numero_pedido::text, '') || ' - ' || COALESCE(NEW.nome_produto, ''), 'ruptura', 'carregamento', NEW.id::text);
    PERFORM notify_role('admin', 'Ruptura registrada', 'Ruptura no pedido ' || COALESCE(NEW.numero_pedido::text, '') || ' - ' || COALESCE(NEW.nome_produto, ''), 'ruptura', 'carregamento', NEW.id::text);
  END IF;

  RETURN NEW;
END;
$function$;