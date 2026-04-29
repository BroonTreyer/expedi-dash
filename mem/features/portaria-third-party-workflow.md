---
name: Third-party workflow
description: Third-party Portaria flow with two-step entry (Arrival → Yard release), Cleared, Exit
type: feature
---
O controle de Portaria para veículos Terceirizados (e Frota Própria vinculados a carga fechada) usa fluxo em DUAS etapas para entrada:

1. **Registrar chegada**: motorista chega na portaria. Cria movimento `tipo_movimento=entrada` com `horario_chegada=now()`, `horario_entrada=NULL`, `etapa_terceirizado='chegada'` (ou `etapa_carga_propria='aguardando_liberacao'`). Veículo NÃO aparece em "Pátio Atual" nem nos KPIs de "No Pátio". `veiculos_esperados.conferido` permanece `false`.
2. **Liberar entrada no pátio**: porteiro autoriza a entrada. UPDATE no mesmo movimento setando `horario_entrada=now()` e `etapa_terceirizado='no_patio'` (ou `etapa_carga_propria='chegou'`). `veiculos_esperados.conferido=true`. A partir daí entra em "Pátio Atual" e KPIs.

Estado intermediário "Aguardando liberação" mostra cronômetro de espera no painel `CargasFechadasAguardandoPanel` e permite "Desfazer chegada" (DELETE só permitido enquanto `horario_entrada IS NULL`).

Campos obrigatórios na chegada: Empresa, Foto da Placa, Placa, Motorista, Tipo de Caminhão. O sistema calcula Tempo de Espera (fila) e Tempo Total de permanência. Após liberação seguem as etapas: Liberado para carregar → Saída.
