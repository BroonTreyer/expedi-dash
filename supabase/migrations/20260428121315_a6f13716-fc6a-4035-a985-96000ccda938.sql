
-- ============================================================
-- AUDITORIA: correções estruturais (Fase 1)
-- 1) Limpa duplicatas legacy
-- 2) Trigger numero_pedido automático
-- 3) Trigger anti-peso-inflado
-- 4) Trigger vincula veiculo_esperado quando placa preenchida tarde
-- 5) Revoga EXECUTE de funções sensíveis
-- ============================================================

-- 1) CLEANUP: mantém a linha mais antiga de cada grupo duplicado
-- Remove duplicatas reais (mesmo produto, mesmo cliente, mesma data, mesma carga, mesma etapa logística)
WITH dup_groups AS (
  SELECT id,
    row_number() OVER (
      PARTITION BY codigo_produto, cliente, data, COALESCE(carga_id,'_'), etapa
      ORDER BY created_at ASC
    ) AS rn
  FROM public.carregamentos_dia
  WHERE etapa = 'logistica'
    AND created_at > now() - interval '60 days'
)
DELETE FROM public.carregamentos_dia
WHERE id IN (SELECT id FROM dup_groups WHERE rn > 1);

-- 2) Trigger preenche numero_pedido automaticamente
CREATE OR REPLACE FUNCTION public.set_numero_pedido()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.numero_pedido IS NULL THEN
    NEW.numero_pedido := public.next_numero_pedido(NEW.data);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_numero_pedido ON public.carregamentos_dia;
CREATE TRIGGER trg_set_numero_pedido
BEFORE INSERT ON public.carregamentos_dia
FOR EACH ROW EXECUTE FUNCTION public.set_numero_pedido();

-- 2b) Backfill numero_pedido para linhas existentes (por data, ordem de criação)
WITH renum AS (
  SELECT id,
    row_number() OVER (PARTITION BY data ORDER BY created_at ASC) AS n
  FROM public.carregamentos_dia
  WHERE numero_pedido IS NULL
)
UPDATE public.carregamentos_dia c
SET numero_pedido = r.n
FROM renum r
WHERE c.id = r.id;

-- 3) Anti-peso-inflado: bloqueia peso > peso_original em UPDATE
CREATE OR REPLACE FUNCTION public.cap_peso_pelo_original()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.peso_original IS NOT NULL
     AND NEW.peso IS NOT NULL
     AND NEW.peso > NEW.peso_original * 1.001 THEN
    -- tolerância 0.1% para arredondamentos; acima disso, capa no original
    NEW.peso := NEW.peso_original;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cap_peso ON public.carregamentos_dia;
CREATE TRIGGER trg_cap_peso
BEFORE UPDATE ON public.carregamentos_dia
FOR EACH ROW EXECUTE FUNCTION public.cap_peso_pelo_original();

-- 4) Quando placa é preenchida em uma carga já fechada e ainda não há veiculo_esperado, cria
CREATE OR REPLACE FUNCTION public.vincular_veiculo_esperado_tardio()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _exists boolean;
  _grupo text;
BEGIN
  IF NEW.etapa = 'logistica'
     AND NEW.carga_id IS NOT NULL
     AND NEW.placa IS NOT NULL
     AND (OLD.placa IS NULL OR OLD.placa = '' OR OLD.placa IS DISTINCT FROM NEW.placa) THEN
    SELECT EXISTS(SELECT 1 FROM public.veiculos_esperados WHERE carga_id = NEW.carga_id) INTO _exists;
    IF NOT _exists THEN
      _grupo := CASE
        WHEN NEW.transportadora IS NOT NULL AND NEW.transportadora <> '' THEN 'TERCEIRIZADO'
        ELSE 'PRÓPRIA'
      END;
      INSERT INTO public.veiculos_esperados (
        data_referencia, grupo, placa, motorista, transportadora,
        tipo_veiculo, carga_id, status_autorizacao, walk_in
      ) VALUES (
        COALESCE(NEW.data, CURRENT_DATE), _grupo, NEW.placa, NEW.motorista, NEW.transportadora,
        NEW.tipo_caminhao, NEW.carga_id, 'previsto', false
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_vincular_veiculo_tardio ON public.carregamentos_dia;
CREATE TRIGGER trg_vincular_veiculo_tardio
AFTER UPDATE ON public.carregamentos_dia
FOR EACH ROW EXECUTE FUNCTION public.vincular_veiculo_esperado_tardio();

-- 5) Revoga EXECUTE de funções sensíveis (anon e authenticated não devem chamar diretamente)
REVOKE EXECUTE ON FUNCTION public.notify_role(app_role, text, text, text, text, text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_audit(text, text, text, jsonb) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_audit(text, text, text, jsonb, uuid, text, text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_clients_to_orders() FROM anon;
-- mantém sync_clients_to_orders para authenticated pq UI Admin a usa

-- 6) Backfill veículos esperados faltantes (cargas órfãs já existentes)
INSERT INTO public.veiculos_esperados (data_referencia, grupo, placa, motorista, transportadora, tipo_veiculo, carga_id, status_autorizacao, walk_in)
SELECT DISTINCT ON (cd.carga_id)
  cd.data,
  CASE WHEN cd.transportadora IS NOT NULL AND cd.transportadora <> '' THEN 'TERCEIRIZADO' ELSE 'PRÓPRIA' END,
  cd.placa,
  cd.motorista,
  cd.transportadora,
  cd.tipo_caminhao,
  cd.carga_id,
  'previsto',
  false
FROM public.carregamentos_dia cd
LEFT JOIN public.veiculos_esperados ve ON ve.carga_id = cd.carga_id
WHERE cd.carga_id IS NOT NULL
  AND cd.etapa = 'logistica'
  AND cd.placa IS NOT NULL
  AND ve.id IS NULL
  AND cd.created_at > now() - interval '30 days'
ORDER BY cd.carga_id, cd.created_at DESC;
