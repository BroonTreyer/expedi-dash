
-- ============================================================
-- FASE 1: Saneamento de triggers, índices e dados órfãos
-- ============================================================

-- 1) Drop triggers duplicados (mantém apenas os com prefixo trg_)
DROP TRIGGER IF EXISTS audit_caminhoes_trigger ON public.caminhoes;
DROP TRIGGER IF EXISTS audit_clientes_trigger ON public.clientes;
DROP TRIGGER IF EXISTS audit_motoristas_trigger ON public.motoristas;
DROP TRIGGER IF EXISTS audit_movimentacoes_trigger ON public.movimentacoes_portaria;
DROP TRIGGER IF EXISTS audit_produtos_trigger ON public.produtos;
DROP TRIGGER IF EXISTS audit_veiculos_esperados_trigger ON public.veiculos_esperados;
DROP TRIGGER IF EXISTS audit_vendedores_trigger ON public.vendedores;

-- Trigger duplicado de notificação de entrada na portaria
DROP TRIGGER IF EXISTS trg_entrada_portaria ON public.movimentacoes_portaria;
-- (mantém trg_on_entrada_portaria)

-- 2) Drop índices duplicados em carregamentos_dia
DROP INDEX IF EXISTS public.idx_carregamentos_carga;            -- duplicado de idx_carregamentos_carga_id
DROP INDEX IF EXISTS public.idx_carregamentos_dia_carga_id;     -- duplicado de idx_carregamentos_carga_id
DROP INDEX IF EXISTS public.idx_carregamentos_data;             -- duplicado de idx_carregamentos_dia_data
DROP INDEX IF EXISTS public.idx_carregamentos_dia_status;       -- duplicado de idx_carregamentos_status
DROP INDEX IF EXISTS public.carregamentos_dia_row_op_key_unique;-- duplicado de uq_carregamentos_row_op_key
DROP INDEX IF EXISTS public.idx_carregamentos_operation_id;     -- duplicado de carregamentos_dia_operation_id_idx

-- 3) Limpeza de dados órfãos / inconsistentes

-- 3a) veiculos_esperados apontando para carga_id que não existe -> marcar como cancelado
--     (não delete, preserva histórico)
UPDATE public.veiculos_esperados ve
SET carga_id = NULL,
    status_autorizacao = CASE
      WHEN ve.conferido = false AND ve.status_autorizacao IN ('previsto','aguardando_vinculo','aguardando_autorizacao','autorizado')
        THEN 'cancelado'
      ELSE ve.status_autorizacao
    END,
    observacoes = COALESCE(ve.observacoes || E'\n', '') || '[saneamento] carga_id removido: carga não existia mais em ' || to_char(now(),'DD/MM/YYYY HH24:MI')
WHERE ve.carga_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.carregamentos_dia c WHERE c.carga_id = ve.carga_id
  );

-- 3b) movimentos de entrada sem horario_chegada: usar data_hora como chegada
UPDATE public.movimentacoes_portaria
SET horario_chegada = data_hora
WHERE tipo_movimento = 'entrada'
  AND horario_chegada IS NULL;

-- 3c) cargas próprias com entrada já liberada mas sem etapa: setar 'chegou'
UPDATE public.movimentacoes_portaria
SET etapa_carga_propria = 'chegou'
WHERE categoria = 'carga_propria'
  AND tipo_movimento = 'entrada'
  AND etapa_carga_propria IS NULL
  AND horario_entrada IS NOT NULL;

-- 3d) cargas próprias sem etapa e sem horario_entrada: setar 'aguardando_liberacao'
UPDATE public.movimentacoes_portaria
SET etapa_carga_propria = 'aguardando_liberacao'
WHERE categoria = 'carga_propria'
  AND tipo_movimento = 'entrada'
  AND etapa_carga_propria IS NULL
  AND horario_entrada IS NULL;

-- 3e) Resolver duplicatas de placa em pátio aberto (mesma placa, mesmo dia, sem saída)
--     Mantém o mais recente, fecha os anteriores como saída forçada
WITH duplicados AS (
  SELECT id, placa, data_hora,
         ROW_NUMBER() OVER (PARTITION BY placa, data_hora::date ORDER BY data_hora DESC) AS rn
  FROM public.movimentacoes_portaria
  WHERE tipo_movimento = 'entrada'
    AND horario_real_saida IS NULL
    AND placa IS NOT NULL
)
UPDATE public.movimentacoes_portaria m
SET horario_real_saida = now(),
    horario_saida_final = now(),
    observacoes = COALESCE(observacoes || E'\n', '') || '[saneamento] saída forçada: havia entrada duplicada mais recente'
FROM duplicados d
WHERE m.id = d.id AND d.rn > 1;

-- 4) Revogar EXECUTE de funções SECURITY DEFINER para anon
--    Mantém acesso anônimo apenas para o portal público
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.notify_role(app_role, text, text, text, text, text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_audit(text, text, text, jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.log_audit(text, text, text, jsonb, uuid, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.next_numero_pedido(date) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_my_vendedor_id() FROM anon;
REVOKE EXECUTE ON FUNCTION public.sync_clients_to_orders() FROM anon, authenticated;

-- (mantém get_portal_data_public e get_portal_token_public abertas — necessárias para o portal do motorista)
