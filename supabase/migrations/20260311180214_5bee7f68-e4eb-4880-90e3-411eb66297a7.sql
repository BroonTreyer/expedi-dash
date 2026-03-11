
ALTER TABLE public.carregamentos_dia ADD COLUMN numero_pedido integer;

CREATE OR REPLACE FUNCTION public.next_numero_pedido(_data date)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(MAX(numero_pedido), 0) + 1
  FROM public.carregamentos_dia
  WHERE data = _data
$$;
