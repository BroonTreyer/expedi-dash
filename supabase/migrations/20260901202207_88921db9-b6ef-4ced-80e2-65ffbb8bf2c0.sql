DROP POLICY IF EXISTS "Admin delete adiantamentos_frete" ON public.adiantamentos_frete;
CREATE POLICY "Admin/log delete adiantamentos_frete"
ON public.adiantamentos_frete FOR DELETE TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR (public.has_role(auth.uid(), 'logistica'::app_role) AND status = 'pendente')
);

CREATE OR REPLACE FUNCTION public.criar_adiantamento(_payload jsonb)
RETURNS public.adiantamentos_frete
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_header public.adiantamentos_frete;
  v_numero text;
  v_ctes jsonb := COALESCE(_payload->'ctes', '[]'::jsonb);
  v_conflitos int;
BEGIN
  IF v_uid IS NULL OR NOT (public.has_role(v_uid,'admin') OR public.has_role(v_uid,'logistica')) THEN
    RAISE EXCEPTION 'Sem permissão para gerar adiantamento';
  END IF;
  IF jsonb_array_length(v_ctes) = 0 THEN
    RAISE EXCEPTION 'Não é possível gerar adiantamento sem CT-e vinculado.';
  END IF;

  -- Trava: nenhum CT-e pode estar em outro adiantamento ativo
  SELECT count(*) INTO v_conflitos
  FROM public.adiantamentos_frete_ctes p
  JOIN public.adiantamentos_frete a ON a.id = p.adiantamento_id
  WHERE a.status <> 'cancelado'
    AND p.cte_id IN (SELECT (e->>'id')::uuid FROM jsonb_array_elements(v_ctes) e);
  IF v_conflitos > 0 THEN
    RAISE EXCEPTION '% CT-e(s) já pertencem a outro adiantamento ativo. Operação bloqueada.', v_conflitos;
  END IF;

  v_numero := public.next_adiantamento_numero();

  INSERT INTO public.adiantamentos_frete (
    numero, transportadora, transportadora_id, tipo_agrupamento, ordem_carga,
    qtd_ctes, peso_total, valor_total_ctes, percentual, valor_adiantamento, valor_saldo,
    status, observacoes, created_by, created_at
  ) VALUES (
    v_numero,
    _payload->>'transportadora',
    NULLIF(_payload->>'transportadora_id','')::uuid,
    _payload->>'tipo_agrupamento',
    NULLIF(_payload->>'ordem_carga',''),
    jsonb_array_length(v_ctes),
    COALESCE((_payload->>'peso_total')::numeric, 0),
    COALESCE((_payload->>'valor_total_ctes')::numeric, 0),
    COALESCE((_payload->>'percentual')::numeric, 0),
    COALESCE((_payload->>'valor_adiantamento')::numeric, 0),
    COALESCE((_payload->>'valor_saldo')::numeric, 0),
    'pendente',
    NULLIF(_payload->>'observacoes',''),
    v_uid,
    COALESCE((_payload->>'created_at')::timestamptz, now())
  ) RETURNING * INTO v_header;

  INSERT INTO public.adiantamentos_frete_ctes (adiantamento_id, cte_id, valor_frete)
  SELECT v_header.id, (e->>'id')::uuid, COALESCE((e->>'valor_frete')::numeric, 0)
  FROM jsonb_array_elements(v_ctes) e;

  RETURN v_header;
END;
$$;

REVOKE ALL ON FUNCTION public.criar_adiantamento(jsonb) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.criar_adiantamento(jsonb) TO authenticated;