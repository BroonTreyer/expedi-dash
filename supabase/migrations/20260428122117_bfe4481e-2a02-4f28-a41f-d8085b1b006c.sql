-- 1. Corrige a trigger: reutiliza numero_pedido entre linhas da mesma operação
CREATE OR REPLACE FUNCTION public.set_numero_pedido()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _existing integer;
BEGIN
  IF NEW.numero_pedido IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Tenta reutilizar numero_pedido de outra linha da MESMA operação na mesma data
  IF NEW.operation_id IS NOT NULL THEN
    SELECT numero_pedido INTO _existing
    FROM public.carregamentos_dia
    WHERE operation_id = NEW.operation_id
      AND data = NEW.data
      AND numero_pedido IS NOT NULL
    ORDER BY numero_pedido ASC
    LIMIT 1;

    IF _existing IS NOT NULL THEN
      NEW.numero_pedido := _existing;
      RETURN NEW;
    END IF;
  END IF;

  NEW.numero_pedido := public.next_numero_pedido(NEW.data);
  RETURN NEW;
END;
$function$;

-- 2. Backfill: unifica pedidos fragmentados dos últimos 7 dias
-- Critério de agrupamento: mesma data + mesmo codigo_cliente + criados na mesma janela de 5s
WITH grupos AS (
  SELECT
    id,
    numero_pedido,
    MIN(numero_pedido) OVER (
      PARTITION BY data, codigo_cliente, date_trunc('minute', created_at), (extract(second from created_at)::int / 5)
    ) AS novo_numero,
    COUNT(*) OVER (
      PARTITION BY data, codigo_cliente, date_trunc('minute', created_at), (extract(second from created_at)::int / 5)
    ) AS tamanho_grupo
  FROM public.carregamentos_dia
  WHERE created_at > now() - interval '7 days'
    AND codigo_cliente IS NOT NULL
    AND numero_pedido IS NOT NULL
)
UPDATE public.carregamentos_dia cd
SET numero_pedido = g.novo_numero
FROM grupos g
WHERE cd.id = g.id
  AND g.tamanho_grupo > 1
  AND cd.numero_pedido IS DISTINCT FROM g.novo_numero;