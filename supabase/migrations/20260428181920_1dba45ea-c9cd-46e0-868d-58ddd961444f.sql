DO $$
DECLARE
  _snapshot_id uuid;
  _affected_carga_ids text[] := ARRAY['CEARA DOM EL. + ACAILANDIA ', 'CEARA DOM EL+ ACAILANDIA', 'ACAILANDIA  & DOM ELIZEU'];
  _restored_count int := 0;
  _kg_restored numeric := 0;
  r record;
BEGIN
  -- 1) Snapshot de segurança das linhas que serão tocadas
  INSERT INTO public.data_snapshots (description, snapshot_data, record_counts)
  SELECT 
    'Pré-restauração de pesos cargas CEARA DOM EL/ACAILANDIA (28/04) - bug edição em massa',
    jsonb_build_object('carregamentos_dia', jsonb_agg(to_jsonb(cd))),
    jsonb_build_object('carregamentos_dia', count(*))
  FROM public.carregamentos_dia cd
  WHERE cd.carga_id = ANY(_affected_carga_ids)
  RETURNING id INTO _snapshot_id;

  RAISE NOTICE 'Snapshot criado: %', _snapshot_id;

  -- 2) Restaura peso usando audit_log (registro 'criado') como fonte de verdade
  FOR r IN
    WITH alvos AS (
      SELECT id, peso AS peso_atual, numero_pedido, nome_produto
      FROM public.carregamentos_dia
      WHERE peso = 40 AND carga_id = ANY(_affected_carga_ids)
    ),
    pesos_originais AS (
      SELECT al.entity_id::uuid AS id,
             (al.changes->'novo'->>'peso')::numeric AS peso_orig
      FROM public.audit_log al
      WHERE al.entity_type = 'carregamento'
        AND al.action = 'criado'
        AND al.entity_id IN (SELECT id::text FROM alvos)
    )
    SELECT a.id, a.peso_atual, p.peso_orig, a.numero_pedido, a.nome_produto
    FROM alvos a
    JOIN pesos_originais p ON p.id = a.id
    WHERE p.peso_orig > 40  -- só restaura quem realmente teve peso original maior
  LOOP
    UPDATE public.carregamentos_dia
    SET peso = r.peso_orig,
        peso_original = r.peso_orig,
        ruptura_sinalizada = false,
        peso_manual = true
    WHERE id = r.id;

    INSERT INTO public.audit_log (entity_type, entity_id, action, user_email, changes)
    VALUES (
      'carregamento', r.id::text, 'alterado', 'sistema@restauracao',
      jsonb_build_object(
        'peso', jsonb_build_object('de', 40, 'para', r.peso_orig),
        'motivo', 'Restauração automática: peso havia sido incorretamente alterado para 40 kg em 28/04 14:15-14:27 por edição em massa indevida. Valor restaurado a partir do registro de criação no audit log. Snapshot pré-restauração: ' || _snapshot_id::text
      )
    );

    _restored_count := _restored_count + 1;
    _kg_restored := _kg_restored + (r.peso_orig - 40);
  END LOOP;

  RAISE NOTICE 'Restauração concluída: % itens, % kg recuperados', _restored_count, _kg_restored;
END $$;