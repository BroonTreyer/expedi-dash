CREATE OR REPLACE FUNCTION public.get_portal_data_public(_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _tk record;
  _pedidos jsonb;
BEGIN
  SELECT carga_id, nome_carga, placa, motorista, transportadora, expires_at
    INTO _tk
  FROM public.portal_tokens
  WHERE token = _token AND expires_at > now()
  LIMIT 1;

  IF _tk IS NULL THEN
    RETURN jsonb_build_object('error', 'invalid_or_expired');
  END IF;

  SELECT COALESCE(jsonb_agg(to_jsonb(p) ORDER BY p.ordem_entrega NULLS LAST, p.numero_pedido NULLS LAST), '[]'::jsonb)
    INTO _pedidos
  FROM public.carregamentos_dia p
  WHERE p.carga_id = _tk.carga_id;

  RETURN jsonb_build_object(
    'token', jsonb_build_object(
      'carga_id', _tk.carga_id,
      'nome_carga', _tk.nome_carga,
      'placa', _tk.placa,
      'motorista', _tk.motorista,
      'transportadora', _tk.transportadora,
      'expires_at', _tk.expires_at
    ),
    'pedidos', _pedidos
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_portal_data_public(text) TO anon, authenticated;