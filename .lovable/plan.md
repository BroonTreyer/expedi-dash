## Diagnóstico

- A carga **JORGE BATISTA** (placa anterior QWA2B01 / motorista AIRTON / MOREIRA) foi **reaberta às 10:59:45** pelo usuário `logistica@frico.ind.br`: os 16 pedidos voltaram para `etapa=vendas` com placa, motorista, transportadora, tipo_caminhao, carga_id, nome_carga e ordem_entrega zerados.
- O usuário tentou re-fechar com **Valdir Vilalba Júnior / QIB8H90 / MOREIRA-ALVORADA**, mas **nada foi persistido**: o `audit_log` não tem nenhuma alteração nos pedidos JORGE BATISTA depois de 10:59, e o `veiculos_esperados` do Valdir continua com `carga_id=NULL` e `status_autorizacao='aguardando_vinculo'`.
- Por isso o Valdir aparece como walk-in pendente (sem carga) em vez do card azul.

## Plano de correção

Executar via tool `supabase--insert` em **uma única transação lógica**:

1. **Re-fechar os pedidos** que pertenciam à JORGE BATISTA (todos os 16 IDs com `carga_id` "JORGE BATISTA" no audit das 10:59):
   - `carga_id = 'JORGE BATISTA'`
   - `nome_carga = 'JORGE BATISTA'`
   - `placa = 'QIB8H90'`
   - `motorista = 'VALDIR VILALBA JÚNIOR'`
   - `transportadora = 'MOREIRA - ALVORADA'`
   - `tipo_caminhao = 'Carreta'`
   - `etapa = 'logistica'`
   - `status = 'Carregado'`
   - Preservar a `ordem_entrega` original de cada pedido (1, 5, 5, 5, 6, 6, 7, 8, 8 …) recuperando do audit.

2. **Atualizar `veiculos_esperados`** do Valdir (id `5e1c1f1f-4972-486a-a94d-3d4697c05d03`):
   - `carga_id = 'JORGE BATISTA'`
   - `status_autorizacao = 'autorizado'`
   - `autorizado_em = now()`

3. **Propagar `carga_id` para a movimentação** de chegada do Valdir (id `b002af7e-c7c9-42ea-89ce-c37816416cb3`), para o card azul aparecer no pátio.

O trigger `on_carga_fechada` não disparará novas notificações duplicadas porque a transição de etapa é `vendas → logistica` (igual a um fechamento normal). O trigger `audit_carregamentos` vai registrar o re-fechamento no histórico.

## Observação

Não vou alterar nenhum código de UI nesta passagem — é só recuperação de dados. Se quiser depois eu posso investigar por que a UI deixou o fechamento ser "perdido" silenciosamente (provável causa: o dialog foi fechado antes da mutation completar, ou houve erro de validação sem toast). Isso ficaria como tarefa separada.
