# Editar pedido inteiro (todos os produtos) + corrigir duplicação ao trocar nº pedido / cliente

## Problema

Hoje, ao clicar em editar um item do pedido 3301 e trocar o número para 33011 (ou trocar o cliente), o sistema parece "criar outro pedido". Acontece porque:

1. O botão **Editar** envia ao diálogo apenas **uma linha de produto**, nunca os irmãos do mesmo pedido.
2. Ao salvar, só essa linha recebe o novo `numero_pedido` / `cliente`. Os outros produtos do pedido continuam com os valores antigos.
3. A propagação automática (`SHARED_FIELDS` em `src/pages/Index.tsx`) busca irmãos pelo `numero_pedido` **antigo** e copia alguns campos — mas `numero_pedido` e `data` **não estão na lista**, então os irmãos não são renumerados nem o cliente é atualizado neles de forma consistente.
4. Resultado visual: o pedido aparece "partido em dois" — um grupo com 33011/cliente novo e outro com 3301/cliente antigo, dando a impressão de duplicação.

## Solução

### 1. Botão "Editar pedido inteiro" no agrupamento

Em `src/components/dashboard/CarregamentoTable.tsx`, quando o grupo tem mais de 1 produto (mesmo cliente + mesmo `numero_pedido`), o ícone de editar passa a chamar um novo callback `onEditGroup(group.items)` em vez de `onEdit(first)`. Para grupos de 1 item, mantém o comportamento atual.

Aplicar nos três pontos da tabela onde `onEdit` é chamado (desktop expandido, mobile, header do grupo) e no `MobileCardView`.

### 2. Novo handler em `Index.tsx`

Adicionar `handleEditGroup(items)` que abre o `CarregamentoDialog` no modo `editar` com:
- `editing` = primeiro item do grupo (mantém id real para update)
- `cloneItems` = todos os itens do grupo (reaproveita a lógica de hidratar múltiplos produtos já existente em `CarregamentoDialog` linha 100-114)
- Um novo flag `editingGroup: true` para o diálogo saber que é edição em grupo.

### 3. `CarregamentoDialog`: salvar pedido inteiro

Quando `editingGroup === true`:
- Linha 1 do array de itens → UPDATE no `editing.id` (já funciona).
- Linhas 2..N que correspondem a itens originais existentes → UPDATE pelos respectivos `id` (carregar via `cloneItems` e mapear `id` → item).
- Linhas adicionadas pelo usuário → INSERT (`_batch`).
- Linhas originais que o usuário removeu → DELETE pelos ids ausentes (`_deleteIds`).

O payload enviado a `onSubmit` ganha:
```ts
{ ...updatePayload, _batchUpdates: [...], _batch: [...], _deleteIds: [...] }
```

### 4. `Index.tsx` `handleSubmit`: aplicar batch e remover cascata por irmãos

Quando recebe `_batchUpdates` / `_deleteIds`:
- Roda `batchUpdateMut` com todos os updates (inclusive o principal — todos compartilham o mesmo `basePayload` com `numero_pedido`, `cliente`, `codigo_cliente`, `cidade`, `uf` etc., garantindo consistência).
- Roda `batchCreateMut` para `_batch` (novos produtos).
- Roda delete em massa para `_deleteIds`.
- **Pula a cascata por `numero_pedido` antigo** (já não é necessária, pois todos os irmãos foram explicitamente atualizados).

Para edição de item único (modo atual), mantém a cascata existente e adiciona `numero_pedido` ao `SHARED_FIELDS` para resolver o caso onde alguém edita apenas 1 produto e troca o nº — assim os irmãos acompanham.

### 5. UX

- Título do diálogo em modo grupo: "Editar pedido completo (N produtos)".
- Manter ações "+ adicionar produto" e remover linha (já existem).
- Toast de confirmação informando quantos produtos foram atualizados/criados/removidos.

## Detalhes técnicos

**Arquivos alterados**:
- `src/components/dashboard/CarregamentoTable.tsx` — novo prop `onEditGroup`, redirecionar clique de editar quando `group.items.length > 1`.
- `src/components/dashboard/CarregamentoDialog.tsx` — receber `editingGroup`, mapear ids originais nos `items`, montar payload com `_batchUpdates` e `_deleteIds`.
- `src/pages/Index.tsx` — novo `handleEditGroup`, processar `_batchUpdates`/`_deleteIds` em `handleSubmit`, adicionar `numero_pedido` em `SHARED_FIELDS`.
- `src/hooks/useCarregamentos.ts` — verificar/adicionar `batchDeleteMut` se ainda não existir (usar o existente se houver).

**Sem mudanças** em banco de dados, RLS, edge functions ou tipos gerados.

## Resultado esperado

- Clicar em editar um pedido com vários produtos abre o diálogo com **todos** os produtos pré-carregados.
- Trocar nº do pedido (3301 → 33011) ou cliente atualiza **todas** as linhas do pedido em uma única operação.
- Não aparece mais "pedido duplicado" — o grupo permanece coeso na tabela.
- Edição de produto único continua funcionando, agora também propagando alteração de `numero_pedido` para os irmãos.
