

# Permitir que Faturamento exclua pedidos

## Problema
Atualmente, o botão de excluir (Trash2) só aparece quando `isAdmin` é `true`. Usuários com perfil "faturamento" não conseguem excluir pedidos/itens.

## Solução
No arquivo `src/components/dashboard/CarregamentoTable.tsx`, substituir todas as verificações `isAdmin` que controlam a exibição do botão de exclusão por `isAdmin || isFaturamento` (ou uma variável `canDelete`).

### Locais a alterar em `CarregamentoTable.tsx`
Há 4 ocorrências de `{isAdmin && (` antes de `onDelete`:
1. **Mobile** (~linha 182) — item individual
2. **Desktop ungrouped** (~linha 457) — linha simples
3. **Desktop grouped header** (~linha 573) — exclusão do grupo inteiro
4. **Desktop grouped sub-item** (~linha 632) — item dentro do grupo

Em cada uma, trocar `isAdmin` por `canDelete` onde `const canDelete = isAdmin || isFaturamento`.

A variável `isFaturamento` já existe nos dois componentes (mobile e desktop). Basta criar `canDelete` e usá-la nos 4 pontos.

## Arquivo editado
- `src/components/dashboard/CarregamentoTable.tsx`

