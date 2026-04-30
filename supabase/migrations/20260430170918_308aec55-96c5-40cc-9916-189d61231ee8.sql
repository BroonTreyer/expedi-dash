-- Remove gatilhos duplicados em public.carregamentos_dia.
-- Cada par abaixo executa o mesmo trigger function: mantemos um, dropamos o outro.

DROP TRIGGER IF EXISTS trg_cap_peso ON public.carregamentos_dia;
DROP TRIGGER IF EXISTS audit_carregamentos_trigger ON public.carregamentos_dia;
DROP TRIGGER IF EXISTS trg_carga_fechada ON public.carregamentos_dia;
DROP TRIGGER IF EXISTS trg_ruptura_sinalizada ON public.carregamentos_dia;
DROP TRIGGER IF EXISTS trg_vincular_veiculo_esperado_tardio ON public.carregamentos_dia;
DROP TRIGGER IF EXISTS trg_pedido_enviado_aprovacao ON public.carregamentos_dia;
DROP TRIGGER IF EXISTS trg_pedido_aprovado_rejeitado ON public.carregamentos_dia;
DROP TRIGGER IF EXISTS update_carregamentos_dia_updated_at ON public.carregamentos_dia;