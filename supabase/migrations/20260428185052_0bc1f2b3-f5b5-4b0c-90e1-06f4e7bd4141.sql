
-- ============================================================================
-- FASE 2: Blindagem do banco contra corrupção em cascata
-- ============================================================================
-- Garante que as funções de proteção existentes sejam realmente acionadas
-- (triggers attached) e adiciona índices que aceleram o agrupamento por
-- (data, codigo_cliente, numero_pedido) usado na UI.

-- 1) Triggers de proteção em carregamentos_dia ----------------------------------
DROP TRIGGER IF EXISTS trg_preserve_peso_original ON public.carregamentos_dia;
CREATE TRIGGER trg_preserve_peso_original
BEFORE INSERT OR UPDATE ON public.carregamentos_dia
FOR EACH ROW EXECUTE FUNCTION public.preserve_peso_original();

DROP TRIGGER IF EXISTS trg_cap_peso_pelo_original ON public.carregamentos_dia;
CREATE TRIGGER trg_cap_peso_pelo_original
BEFORE INSERT OR UPDATE ON public.carregamentos_dia
FOR EACH ROW EXECUTE FUNCTION public.cap_peso_pelo_original();

DROP TRIGGER IF EXISTS trg_set_numero_pedido ON public.carregamentos_dia;
CREATE TRIGGER trg_set_numero_pedido
BEFORE INSERT ON public.carregamentos_dia
FOR EACH ROW EXECUTE FUNCTION public.set_numero_pedido();

DROP TRIGGER IF EXISTS trg_set_ruptura_sinalizada ON public.carregamentos_dia;
CREATE TRIGGER trg_set_ruptura_sinalizada
BEFORE INSERT OR UPDATE ON public.carregamentos_dia
FOR EACH ROW EXECUTE FUNCTION public.set_ruptura_sinalizada();

DROP TRIGGER IF EXISTS trg_update_carregamentos_updated_at ON public.carregamentos_dia;
CREATE TRIGGER trg_update_carregamentos_updated_at
BEFORE UPDATE ON public.carregamentos_dia
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_audit_carregamentos ON public.carregamentos_dia;
CREATE TRIGGER trg_audit_carregamentos
AFTER INSERT OR UPDATE OR DELETE ON public.carregamentos_dia
FOR EACH ROW EXECUTE FUNCTION public.audit_carregamentos();

DROP TRIGGER IF EXISTS trg_on_carga_fechada ON public.carregamentos_dia;
CREATE TRIGGER trg_on_carga_fechada
AFTER UPDATE ON public.carregamentos_dia
FOR EACH ROW EXECUTE FUNCTION public.on_carga_fechada();

DROP TRIGGER IF EXISTS trg_vincular_veiculo_esperado_tardio ON public.carregamentos_dia;
CREATE TRIGGER trg_vincular_veiculo_esperado_tardio
AFTER UPDATE ON public.carregamentos_dia
FOR EACH ROW EXECUTE FUNCTION public.vincular_veiculo_esperado_tardio();

DROP TRIGGER IF EXISTS trg_on_pedido_enviado_aprovacao ON public.carregamentos_dia;
CREATE TRIGGER trg_on_pedido_enviado_aprovacao
AFTER INSERT OR UPDATE ON public.carregamentos_dia
FOR EACH ROW EXECUTE FUNCTION public.on_pedido_enviado_aprovacao();

DROP TRIGGER IF EXISTS trg_on_pedido_aprovado_rejeitado ON public.carregamentos_dia;
CREATE TRIGGER trg_on_pedido_aprovado_rejeitado
AFTER UPDATE ON public.carregamentos_dia
FOR EACH ROW EXECUTE FUNCTION public.on_pedido_aprovado_rejeitado();

-- 2) Triggers de auditoria em cadastros ----------------------------------------
DROP TRIGGER IF EXISTS trg_audit_clientes ON public.clientes;
CREATE TRIGGER trg_audit_clientes
AFTER INSERT OR UPDATE OR DELETE ON public.clientes
FOR EACH ROW EXECUTE FUNCTION public.audit_generic_cadastro('cliente');

DROP TRIGGER IF EXISTS trg_audit_produtos ON public.produtos;
CREATE TRIGGER trg_audit_produtos
AFTER INSERT OR UPDATE OR DELETE ON public.produtos
FOR EACH ROW EXECUTE FUNCTION public.audit_generic_cadastro('produto');

DROP TRIGGER IF EXISTS trg_audit_motoristas ON public.motoristas;
CREATE TRIGGER trg_audit_motoristas
AFTER INSERT OR UPDATE OR DELETE ON public.motoristas
FOR EACH ROW EXECUTE FUNCTION public.audit_generic_cadastro('motorista');

DROP TRIGGER IF EXISTS trg_audit_caminhoes ON public.caminhoes;
CREATE TRIGGER trg_audit_caminhoes
AFTER INSERT OR UPDATE OR DELETE ON public.caminhoes
FOR EACH ROW EXECUTE FUNCTION public.audit_generic_cadastro('caminhao');

DROP TRIGGER IF EXISTS trg_audit_vendedores ON public.vendedores;
CREATE TRIGGER trg_audit_vendedores
AFTER INSERT OR UPDATE OR DELETE ON public.vendedores
FOR EACH ROW EXECUTE FUNCTION public.audit_generic_cadastro('vendedor');

DROP TRIGGER IF EXISTS trg_audit_veiculos_esperados ON public.veiculos_esperados;
CREATE TRIGGER trg_audit_veiculos_esperados
AFTER INSERT OR UPDATE OR DELETE ON public.veiculos_esperados
FOR EACH ROW EXECUTE FUNCTION public.audit_generic_cadastro('veiculo_esperado');

-- 3) Triggers de portaria -------------------------------------------------------
DROP TRIGGER IF EXISTS trg_audit_movimentacoes ON public.movimentacoes_portaria;
CREATE TRIGGER trg_audit_movimentacoes
AFTER INSERT OR UPDATE OR DELETE ON public.movimentacoes_portaria
FOR EACH ROW EXECUTE FUNCTION public.audit_movimentacoes();

DROP TRIGGER IF EXISTS trg_on_entrada_portaria ON public.movimentacoes_portaria;
CREATE TRIGGER trg_on_entrada_portaria
AFTER INSERT ON public.movimentacoes_portaria
FOR EACH ROW EXECUTE FUNCTION public.on_entrada_portaria();

DROP TRIGGER IF EXISTS trg_on_veiculo_chegou ON public.veiculos_esperados;
CREATE TRIGGER trg_on_veiculo_chegou
AFTER UPDATE ON public.veiculos_esperados
FOR EACH ROW EXECUTE FUNCTION public.on_veiculo_chegou();

DROP TRIGGER IF EXISTS trg_on_walkin_status_change ON public.veiculos_esperados;
CREATE TRIGGER trg_on_walkin_status_change
AFTER INSERT OR UPDATE ON public.veiculos_esperados
FOR EACH ROW EXECUTE FUNCTION public.on_walkin_status_change();

-- 4) handle_new_user em auth.users ---------------------------------------------
DROP TRIGGER IF EXISTS trg_handle_new_user ON auth.users;
CREATE TRIGGER trg_handle_new_user
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5) Índices para performance do agrupamento e cascatas seguras ----------------
CREATE INDEX IF NOT EXISTS idx_carregamentos_data_cliente_pedido
  ON public.carregamentos_dia (data, codigo_cliente, numero_pedido);

CREATE INDEX IF NOT EXISTS idx_carregamentos_operation_id
  ON public.carregamentos_dia (operation_id) WHERE operation_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_carregamentos_carga_id
  ON public.carregamentos_dia (carga_id) WHERE carga_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_audit_log_entity
  ON public.audit_log (entity_type, entity_id, created_at DESC);

-- 6) Constraint de unicidade idempotente para row_op_key (proteção dupla insert)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' AND indexname = 'uq_carregamentos_row_op_key'
  ) THEN
    CREATE UNIQUE INDEX uq_carregamentos_row_op_key
      ON public.carregamentos_dia (row_op_key)
      WHERE row_op_key IS NOT NULL;
  END IF;
END $$;
