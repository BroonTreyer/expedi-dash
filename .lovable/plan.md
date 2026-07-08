## Diagnóstico

A placa **DPB8J17** foi recusada em `veiculos_esperados`, mas ainda existe uma movimentação órfã em `movimentacoes_portaria` com `etapa_terceirizado = 'chegada'`, sem carga e sem entrada no pátio. A tela também lista essas movimentações órfãs, por isso o card some ao recusar o veículo esperado e volta pelo outro registro.

## Plano

1. **Corrigir o caso atual**
   - Remover/encerrar a movimentação órfã da placa **DPB8J17** para ela parar de aparecer na Portaria Terceirizado.
   - Manter o registro já recusado em `veiculos_esperados` com o motivo existente.

2. **Corrigir a causa no fluxo de Recusar**
   - Quando a Logística recusar um walk-in, além de marcar `veiculos_esperados.status_autorizacao = 'recusado'`, também remover ou finalizar a movimentação de chegada pendente correspondente em `movimentacoes_portaria`.
   - A correspondência será por placa/categoria/entrada pendente, preservando movimentações que já tiveram entrada física registrada.

3. **Ajustar atualização da tela**
   - Invalidar também a query de movimentações órfãs após recusa, para o card desaparecer imediatamente sem esperar o próximo refresh.

4. **Validar**
   - Confirmar no banco que a placa **DPB8J17** não aparece mais nas pendências.
   - Verificar que futuras recusas não deixam movimentação órfã reaparecendo.