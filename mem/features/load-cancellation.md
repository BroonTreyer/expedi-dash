---
name: Load cancellation with reason
description: Closed loads can be cancelled with mandatory reason; orders revert to sales, recorded in ocorrencias_carga
type: feature
---
When a closed load can't be executed (driver leaves, delays, refused vehicle), Admin/Logística/Portaria can cancel it from the "Cargas fechadas aguardando veículo" panel.

Flow:
1. "Cancelar carga" button (destructive ghost) opens dialog with mandatory motivo (predefined list + Outro/free text) and optional observação.
2. Confirmation: insert into `ocorrencias_carga` (motivo, observacao, full carga snapshot incl. original `data_carga`, registrado_por), reverts all `carregamentos_dia` rows of that `carga_id` to `etapa='vendas'`, sets `data = CURRENT_DATE` (so they appear in today's Vendas panel without changing the date filter), clears carga_id/nome_carga/placa/motorista/transportadora/tipo_caminhao/horario_inicio/horario_fim/ordem_entrega, deletes `veiculos_esperados` of that carga_id, deletes pending arrival movement (only if `horario_entrada is null`), logs `audit_log` action='cancelada'.
3. Page `/ocorrencias` (Admin/Logística/Portaria) lists history with date range filter (default 30 days) and free search.

Predefined reasons: "Motorista foi embora (espera demais)", "Atraso operacional", "Veículo recusado", "Cliente cancelou", "Problema no veículo", "Falta de produto", "Outro".

Out of scope: cannot cancel after vehicle entered the yard (card disappears once `horario_entrada` is set).
