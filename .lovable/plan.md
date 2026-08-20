# Voltar Roberto Antunes Santos (QJN3H73) para "Chegou — aguardando liberação"

## Situação atual (verificada no banco)
Hoje (20/08) existem dois registros da placa QJN3H73 / carga CG-20260813-155551-6YL:

- Entrada às 07:40 (horário local) com entrada no pátio às 08:02 e saída final às 08:03 — ciclo completo em ~23 minutos, marcado como `finalizado`.
- Um registro de saída avulso criado às 08:03, vinculado à mesma carga.

Por isso ele aparece no histórico como "Finalizado" em vez do card azul.

## Correção
- Reverter o registro de entrada de hoje para a etapa de chegada: manter o horário de chegada (07:40), limpar o horário de entrada no pátio e o horário de saída final, e voltar a etapa para "chegada".
- Excluir o registro de saída avulso de hoje (08:03), que foi gerado pelo encerramento indevido.

Resultado: o motorista volta ao card azul "Chegou — aguardando liberação" e a portaria pode registrar a entrada normalmente agora.

## Observação
Isto é uma correção de dados pontual; nenhum código muda. Registros de dias anteriores da mesma placa ficam intactos.
