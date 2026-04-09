CREATE OR REPLACE FUNCTION public.sync_clients_to_orders()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _updated integer;
BEGIN
  UPDATE carregamentos_dia cd
  SET cliente = c.nome_cliente,
      cidade = c.cidade,
      uf = c.uf
  FROM clientes c
  WHERE cd.codigo_cliente = c.codigo_cliente
    AND (cd.cliente IS DISTINCT FROM c.nome_cliente
      OR cd.cidade IS DISTINCT FROM c.cidade
      OR cd.uf IS DISTINCT FROM c.uf);
  
  GET DIAGNOSTICS _updated = ROW_COUNT;
  
  RETURN jsonb_build_object('updated', _updated);
END;
$$;