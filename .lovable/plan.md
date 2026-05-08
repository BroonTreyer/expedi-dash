## Ajuste necessário

Ao cancelar/desfazer uma carga, os produtos do mesmo pedido não podem voltar separados. Eles devem retornar para Vendas mantendo o **grupo original do pedido**.

## Causa provável

A tela agrupa os produtos por:

```text
data + codigo_cliente + numero_pedido
```

No cancelamento atual, todos os itens da carga têm os campos logísticos limpos, mas o retorno não garante uma “rebase” consistente do grupo. Se os itens do mesmo pedido ficaram com `data`, `numero_pedido`, `codigo_cliente` ou ordenação efetiva divergente, a UI passa a renderizar linhas separadas.

## Plano de correção

### 1. Corrigir o retorno da carga para Vendas

Alterar `src/components/portaria/CancelarCargaDialog.tsx` no trecho que atualiza `carregamentos_dia` ao cancelar a carga.

Além de limpar os campos de carga, o cancelamento deve:

- manter `numero_pedido`, `codigo_cliente`, `cliente`, produtos, quantidades, pesos e valores intactos;
- limpar resíduos logísticos:
  - `carga_id`
  - `nome_carga`
  - `placa`
  - `motorista`
  - `transportadora`
  - `tipo_caminhao`
  - `ordem_entrega`
  - `ordem_carga`
  - `horario_inicio`
  - `horario_fim`
  - `horario_previsto`
  - `tipo_frete`
- definir `etapa = 'vendas'` e `status = 'Aguardando'` para todos os itens da carga;
- atualizar `updated_at` para o momento do cancelamento.

### 2. Preservar agrupamento do pedido

Antes do UPDATE, buscar os registros da carga cancelada e agrupar por:

```text
codigo_cliente + numero_pedido
```

Para cada grupo, aplicar uma normalização defensiva nos itens do mesmo pedido:

- mesma `data` entre os itens do grupo;
- mesmo `codigo_cliente`;
- mesmo `numero_pedido`;
- mesma `cliente` quando disponível.

Assim, se algum item estiver inconsistente, ele volta junto do pedido original.

### 3. Evitar que pedidos antigos fiquem “perdidos”

Como o problema aconteceu ao cancelar uma carga de ontem, o retorno deve ter comportamento explícito:

- os pedidos voltam para Vendas na data original do pedido, mas como “pendência operacional” já contemplada pela janela de 30 dias existente no dashboard;
- não alterar `data` automaticamente para hoje, para não quebrar o agrupamento original nem misturar histórico de venda com operação.

### 4. Melhorar a mensagem do diálogo

Atualizar o texto do modal para deixar claro:

```text
Os pedidos voltarão para Vendas mantendo os produtos agrupados no pedido original.
```

### 5. Auditoria

No `log_audit`, registrar também:

- quantidade de linhas revertidas;
- quantidade de pedidos/grupos afetados;
- data(s) dos pedidos retornados.

## Validação

1. Cancelar uma carga com pedido contendo múltiplos produtos.
2. Confirmar que todos os produtos voltam dentro do mesmo pedido/card/linha expansível em Vendas.
3. Confirmar que `ordem_carga`, `ordem_entrega`, veículo, motorista e transportadora foram removidos.
4. Confirmar que o pedido continua com seus dados comerciais originais.