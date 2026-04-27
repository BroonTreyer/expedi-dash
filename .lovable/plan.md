# Remover edição isolada de produto

Atualmente o sistema oferece dois caminhos de edição:
1. **Edição de pedido completo** (group edit) — acionada no cabeçalho de pedidos com múltiplos produtos.
2. **Edição isolada de produto** — botão de lápis em cada linha individual (desktop) e em cada card de produto filho (mobile), além de pedidos com um único produto.

A solicitação é manter **apenas a edição completa do pedido**, eliminando a edição isolada por produto.

## Comportamento após a mudança

- Ao clicar em "Editar" em qualquer linha (pai, filho, ou pedido com produto único), o diálogo abrirá em **modo grupo**, carregando **todos os produtos** que compartilham o mesmo `numero_pedido` (e cliente/data) — mesmo quando o pedido tiver apenas 1 item.
- Não haverá mais botão de edição que atue sobre um único produto isolado dentro de um pedido com múltiplos itens.
- A propagação de campos (`SHARED_FIELDS`) permanece, mas se torna redundante — todas as edições já passam pelo fluxo de grupo.

## Alterações técnicas

### `src/components/dashboard/CarregamentoTable.tsx`
- **Desktop (linha ~593 e ~820)**: substituir `onClick={() => onEdit(c)}` nos botões de lápis por uma chamada que sempre dispara `onEditGroup(group.items)` (usando os itens do grupo ao qual a linha pertence). Para o caso de pedido único, `group.items` terá um único elemento e ainda assim entrará no fluxo de grupo.
- **Cabeçalho de grupo (linha ~748)**: simplificar — sempre chamar `onEditGroup(group.items)`, removendo o fallback `onEdit(first)`.
- **Mobile (`MobileCardItem`, linha ~241)**: o `onClick` do botão de editar passa a sempre invocar `onEditGroup(groupItems)` quando disponível. O ramo `onEdit(c)` para item filho (`isGrouped`) é removido.
- A prop `onEdit` permanece na interface para evitar refator em cascata, mas deixa de ser invocada pelos botões de UI (poderá ser removida em limpeza posterior).

### `src/pages/Index.tsx`
- O fluxo de `handleEditGroup` já existe e já trata corretamente pedidos de 1 item (carrega `cloneItems`, ativa `editingGroup`).
- Ajustar `CarregamentoDialog` para garantir que, mesmo com 1 item, abra com a grade de produtos (modo grupo) — verificar se há early-return quando `cloneItems.length === 1`. Se houver, remover a condição.

### `src/components/dashboard/CarregamentoDialog.tsx`
- Garantir que `editingGroup === true` sempre renderize o editor multi-produto, independentemente de `cloneItems.length`.
- Manter validação e payload (`_batchUpdates`, `_batch`, `_deleteIds`) inalterados.

## Resumo
Um único caminho de edição: **sempre o pedido inteiro**. Mais previsível, elimina o risco de criar duplicatas/órfãos por edição parcial e alinha com o fluxo de criação (que já é multi-produto).