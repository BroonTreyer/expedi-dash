# Corrigir erro ao liberar entrada no pátio (QJN3H73 — Roberto)

## O que está acontecendo (verificado no banco)
O registro de hoje da placa QJN3H73 (carga CG-20260813-155551-6YL) está na etapa "chegada", com:
- horário de chegada 07:40 (local)
- horário de entrada no pátio vazio
- **horário de saída para rota ainda preenchido às 08:03** (sobra do ciclo indevido que foi revertido antes)

Quando a portaria clica em "Liberar entrada no pátio", o sistema grava a entrada com o horário atual (10:59). A validação do banco compara com a saída de 08:03, vê uma saída anterior à entrada e bloqueia com a mensagem que apareceu na tela.

## Correção
1. **Dados:** limpar o horário de saída (e retorno, se houver) do registro de hoje do QJN3H73, deixando somente a chegada de 07:40 — assim a liberação de entrada funciona imediatamente.
2. **Código (para não repetir):**
   - Ao liberar entrada no pátio (painel "Cargas fechadas aguardando veículo"), zerar junto os horários de etapas posteriores (saída para rota, retorno, saída final) na mesma atualização, já que o veículo está voltando a entrar.
   - Ao reverter/desfazer uma chegada, limpar todos os horários posteriores em vez de apenas a entrada, evitando registros com etapa "chegada" e horários futuros pendurados.
   - Melhorar a mensagem de erro exibida: quando o banco recusar por ordem de horários, mostrar um aviso claro ("existem horários de etapas posteriores neste registro — corrija em Editar horários") em vez do texto técnico.

## Observação técnica
A validação vem do trigger `validate_etapa_terceirizado` em `movimentacoes_portaria`; a correção é no cliente (`CargasFechadasAguardandoPanel.tsx`) mais um ajuste pontual de dados. Nenhum trigger será alterado.
