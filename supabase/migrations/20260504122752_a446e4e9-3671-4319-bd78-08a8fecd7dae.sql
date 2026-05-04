
-- D1: trigger que restringe valores válidos de etapa_carga_propria
CREATE OR REPLACE FUNCTION public.validate_etapa_carga_propria()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.etapa_carga_propria IS NOT NULL
     AND NEW.etapa_carga_propria NOT IN ('chegou','em_rota','retornou','finalizado') THEN
    RAISE EXCEPTION 'Etapa Carga Própria inválida: %. Valores aceitos: chegou, em_rota, retornou, finalizado.', NEW.etapa_carga_propria;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_etapa_carga_propria ON public.movimentacoes_portaria;
CREATE TRIGGER trg_validate_etapa_carga_propria
BEFORE INSERT OR UPDATE ON public.movimentacoes_portaria
FOR EACH ROW
EXECUTE FUNCTION public.validate_etapa_carga_propria();

-- C1: RPC transacional reabrir_como_walk_in
CREATE OR REPLACE FUNCTION public.reabrir_como_walk_in(
  p_movimento_id uuid,
  p_categoria_destino text DEFAULT 'terceirizado',
  p_grupo text DEFAULT 'WALK-IN-TERCEIRIZADO'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mov RECORD;
  v_user uuid := auth.uid();
  v_user_label text;
  v_obs text;
BEGIN
  -- Permissão
  IF NOT (
    public.has_role(v_user, 'admin'::app_role)
    OR public.has_role(v_user, 'logistica'::app_role)
  ) THEN
    RAISE EXCEPTION 'Sem permissão para reabrir movimento como walk-in';
  END IF;

  SELECT * INTO v_mov
  FROM public.movimentacoes_portaria
  WHERE id = p_movimento_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Movimento % não encontrado', p_movimento_id;
  END IF;

  IF v_mov.placa IS NULL OR length(trim(v_mov.placa)) = 0 THEN
    RAISE EXCEPTION 'Movimentação sem placa — não pode ser enviada para Registro de Entrada';
  END IF;

  SELECT COALESCE(email, id::text) INTO v_user_label
  FROM public.profiles
  WHERE id = v_user;
  IF v_user_label IS NULL THEN v_user_label := 'usuário'; END IF;

  v_obs := 'Reaberto do Pátio Atual em ' || to_char(now() AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI')
        || ' por ' || v_user_label
        || ' — entrada original em '
        || to_char(v_mov.data_hora AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI');

  INSERT INTO public.veiculos_esperados (
    data_referencia, grupo, placa, motorista, transportadora,
    tipo_veiculo, walk_in, status_autorizacao, observacoes, criado_por
  ) VALUES (
    CURRENT_DATE, p_grupo, upper(trim(v_mov.placa)), v_mov.motorista, v_mov.empresa,
    v_mov.tipo_caminhao, true, 'aguardando_vinculo', v_obs, v_user
  );

  INSERT INTO public.movimentacoes_portaria (
    tipo_movimento, categoria, placa, motorista, empresa, tipo_caminhao,
    etapa_terceirizado, horario_chegada, data_hora, observacoes, usuario_id
  ) VALUES (
    'entrada', p_categoria_destino, upper(trim(v_mov.placa)), v_mov.motorista, v_mov.empresa, v_mov.tipo_caminhao,
    'chegada', v_mov.data_hora, v_mov.data_hora, v_obs, v_user
  );

  DELETE FROM public.movimentacoes_portaria WHERE id = p_movimento_id;
END;
$$;

REVOKE ALL ON FUNCTION public.reabrir_como_walk_in(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reabrir_como_walk_in(uuid, text, text) TO authenticated;
