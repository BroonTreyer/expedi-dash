

## Diagnóstico

No `CarregamentoTable.tsx`, o botão lixeira do header de grupo multi-item faz:

```ts
onClick={() => group.items.forEach(i => onDelete(i.id))}
```

Mas `onDelete` em `Index.tsx` / `Rupturas.tsx` é `setDeleteId(id)` — cada chamada sobrescreve o state, então só o último id fica e o dialog confirma a exclusão de **1 item apenas**. Os outros produtos do pedido sobram.

Resultado prático: para apagar um pedido com 3 produtos, o usuário hoje precisa abrir o grupo, clicar lixeira em cada item e confirmar 3 vezes.

## Plano

Implementar **exclusão do pedido inteiro em 1 clique + 1 confirmação única**, preservando a regra de memória `data-safety` (toda exclusão exige confirm dialog).

### 1. Novo handler de batch delete

`src/hooks/useCarregamentos.ts`: adicionar `useBatchDeleteCarregamento` — recebe `string[]` de ids, faz `delete().in("id", ids)` em uma única request, com optimistic update e rollback (mesmo padrão de `useBatchUpdateCarregamento`).

### 2. Nova prop `onDeleteMany` em `CarregamentoTable`

- Assinatura: `onDeleteMany?: (ids: string[]) => void`
- Header do grupo multi-item (linha 707): troca `group.items.forEach(i => onDelete(i.id))` por `onDeleteMany(group.items.map(i => i.id))`.
- Mesma troca no mobile (linha 218 quando `groupItems` tem >1 item) — botão lixeira passa a chamar `onDeleteMany(groupItems.map(i => i.id))`.
- Pedido com 1 item continua usando `onDelete(c.id)` (comportamento atual).

### 3. Wire-up nas páginas

`Index.tsx` e `Rupturas.tsx`:
- Novo state `deleteIds: string[] | null`
- `handleDeleteManyRequest(ids) => setDeleteIds(ids)`
- `handleDeleteManyConfirm` chama `batchDeleteMut.mutate(deleteIds)`
- Reaproveita o **mesmo `DeleteConfirmDialog`** existente, apenas com mensagem dinâmica:
  - 1 item: "Tem certeza que deseja excluir este carregamento?" (texto atual)
  - N itens: "Tem certeza que deseja excluir este pedido completo (N produtos)? Esta ação não pode ser desfeita."

### 4. Comportamento final

- **Pedido com 1 produto** → 1 clique na lixeira → 1 confirmação → deleta (igual hoje).
- **Pedido com N produtos** → 1 clique na lixeira do header do grupo (sem precisar expandir) → 1 confirmação que diz "N produtos" → deleta tudo numa única request.
- Botão lixeira **dentro** das linhas filhas (item individual de um grupo expandido) continua deletando só aquele item — útil para remover um produto isolado de um pedido sem apagar o resto.

### Sem mudanças
- RLS (já permite admin/logística/faturamento)
- `KanbanView`, `Consolidado`, `EditarCargaDialog`
- Auditoria (cada DELETE individual gera linha de log via trigger `audit_carregamentos`)

### Memória
Atualizar `mem://features/data-safety` registrando: exclusão de pedido multi-item usa batch delete com 1 confirmação única, e `mem://features/multi-product-logic` para mencionar que o ícone de lixeira do grupo apaga o pedido inteiro.

## Arquivos
- ✏️ `src/hooks/useCarregamentos.ts` — novo `useBatchDeleteCarregamento` (`.delete().in("id", ids)` + optimistic update)
- ✏️ `src/components/dashboard/CarregamentoTable.tsx` — prop `onDeleteMany`; lixeira do header (mobile e desktop) chama batch quando grupo tem >1 item
- ✏️ `src/pages/Index.tsx` — wire `onDeleteMany`, state `deleteIds[]`, mensagem dinâmica do dialog
- ✏️ `src/pages/Rupturas.tsx` — mesmo wire-up
- ✏️ `mem://features/data-safety` e `mem://features/multi-product-logic`

