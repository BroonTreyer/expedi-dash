CREATE OR REPLACE FUNCTION public.criar_adiantamentos_lote(_payloads jsonb)
RETURNS SETOF public.adiantamentos_frete
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_payload jsonb;
  v_total_ids integer;
  v_distinct_ids integer;
  v_existing_ids integer;
  v_conflitos integer;
BEGIN
  IF v_uid IS NULL OR NOT (public.has_role(v_uid, 'admin') OR public.has_role(v_uid, 'logistica')) THEN
    RAISE EXCEPTION 'Sem permissão para gerar adiantamentos';
  END IF;

  IF _payloads IS NULL OR jsonb_typeof(_payloads) <> 'array' OR jsonb_array_length(_payloads) = 0 THEN
    RAISE EXCEPTION 'Selecione pelo menos um adiantamento para gerar.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(_payloads) p
    WHERE jsonb_typeof(COALESCE(p->'ctes', 'null'::jsonb)) <> 'array'
       OR jsonb_array_length(p->'ctes') = 0
  ) THEN
    RAISE EXCEPTION 'Não é possível gerar adiantamento sem CT-e vinculado.';
  END IF;

  -- Serializa gerações para proteger a numeração e a validação de vínculo.
  PERFORM pg_advisory_xact_lock(hashtext('criar_adiantamentos_lote'));

  WITH ids AS (
    SELECT (c->>'id')::uuid AS id
    FROM jsonb_array_elements(_payloads) p
    CROSS JOIN LATERAL jsonb_array_elements(p->'ctes') c
  )
  SELECT count(*), count(DISTINCT id)
  INTO v_total_ids, v_distinct_ids
  FROM ids;

  IF v_total_ids <> v_distinct_ids THEN
    RAISE EXCEPTION 'O mesmo CT-e foi selecionado mais de uma vez. Operação cancelada.';
  END IF;

  WITH ids AS (
    SELECT DISTINCT (c->>'id')::uuid AS id
    FROM jsonb_array_elements(_payloads) p
    CROSS JOIN LATERAL jsonb_array_elements(p->'ctes') c
  )
  SELECT count(*)
  INTO v_existing_ids
  FROM public.ctes_dacte d
  JOIN ids ON ids.id = d.id;

  IF v_existing_ids <> v_total_ids THEN
    RAISE EXCEPTION 'Um ou mais CT-es selecionados não existem mais. Atualize a tela e tente novamente.';
  END IF;

  WITH ids AS (
    SELECT DISTINCT (c->>'id')::uuid AS id
    FROM jsonb_array_elements(_payloads) p
    CROSS JOIN LATERAL jsonb_array_elements(p->'ctes') c
  )
  SELECT count(*)
  INTO v_conflitos
  FROM public.adiantamentos_frete_ctes link
  JOIN public.adiantamentos_frete a ON a.id = link.adiantamento_id
  JOIN ids ON ids.id = link.cte_id
  WHERE a.status <> 'cancelado';

  IF v_conflitos > 0 THEN
    RAISE EXCEPTION '% CT-e(s) já pertencem a outro adiantamento ativo. Nenhum adiantamento foi criado.', v_conflitos;
  END IF;

  FOR v_payload IN SELECT value FROM jsonb_array_elements(_payloads)
  LOOP
    RETURN NEXT public.criar_adiantamento(v_payload);
  END LOOP;

  RETURN;
END;
$$;

REVOKE ALL ON FUNCTION public.criar_adiantamentos_lote(jsonb) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.criar_adiantamentos_lote(jsonb) TO authenticated;