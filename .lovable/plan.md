Você tem razão: a mudança anterior separou pedidos pelo `numero_pedido` e isso fragmenta quando os produtos do mesmo pedido foram criados com números diferentes por falha anterior. Vou corrigir sem tirar produtos de dentro do pedido.

Plano de correção imediata:

1. Restaurar a visualização correta do pedido
   - Alterar `CarregamentoTable.tsx` para agrupar por `data + codigo_cliente` como unidade visual do pedido.
   - Todos os produtos do mesmo cliente/data voltam a ficar dentro do mesmo bloco expansível.
   - O cabeçalho mostrará, quando existir, os números de pedido contidos ali como informação, mas sem quebrar o bloco.

2. Manter ações no pedido inteiro
   - Editar pedido completo continuará enviando todos os produtos do grupo para o modal.
   - Clonar pedido continuará clonando todos os produtos do grupo.
   - Excluir pedido completo continuará excluindo todos os produtos do grupo, com confirmação.
   - O botão de lixeira em produto individual dentro do grupo não será usado para apagar o pedido inteiro por acidente.

3. Corrigir o bug real sem fragmentar a UI
   - Remover a cascata perigosa que hoje propaga edição por `numero_pedido + data` apenas.
   - Substituir por escopo seguro usando `data + codigo_cliente + numero_pedido` quando a edição for individual.
   - Para edição de pedido completo, manter a lista explícita de IDs do grupo, sem buscar registros “parecidos” no banco.

4. Proteção contra novas fragmentações na criação
   - Ajustar a criação em lote para garantir que todos os produtos do mesmo pedido recebam o mesmo `operation_id` e, consequentemente, o mesmo `numero_pedido` gerado pela trigger.
   - Isso evita que um pedido com vários produtos nasça quebrado em números diferentes.

5. Plano de saneamento de dados já fragmentados
   - Preparar uma migração/data-fix segura para consolidar, nos registros recentes, produtos criados no mesmo instante para o mesmo cliente/data sob um único `numero_pedido`.
   - Critério conservador: mesmo `data`, mesmo `codigo_cliente`, mesmo `created_at` ou mesma janela de criação/lote.
   - Não vou aplicar uma atualização ampla e cega por `codigo_cliente/data` sem critério temporal, para não juntar pedidos que realmente eram separados.

Detalhe técnico principal:

```ts
// Unidade visual do pedido volta a ser cliente + data
const key = `${c.data}__${c.codigo_cliente}`;

// Cascata segura, quando necessária, nunca só por numero_pedido + data
c.numero_pedido === editedItem.numero_pedido &&
c.data === editedItem.data &&
c.codigo_cliente === editedItem.codigo_cliente
```

Depois da aprovação, implemento primeiro a correção visual e da cascata, e em seguida preparo o saneamento seguro dos dados fragmentados.