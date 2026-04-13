

# Adicionar exclusão seletiva na aba Veículos Esperados

## Problema
Atualmente só existe "Limpar lista" que apaga todos os veículos esperados de uma vez. O usuário precisa poder selecionar e apagar registros individuais ou em lote.

## Solução
Adicionar checkboxes de seleção em cada linha (pendente e conferida) + barra de ações com botão "Excluir selecionados" e confirmação.

## Alterações

### `src/hooks/useVeiculosEsperados.ts`
- Adicionar hook `useDeleteVeiculosEsperados` que recebe um array de IDs e deleta todos via `.in('id', ids)`

### `src/components/portaria/VeiculosEsperadosPanel.tsx`
- Adicionar estado `selectedIds: Set<string>`
- Checkbox no header da tabela (selecionar/desmarcar todos visíveis)
- Checkbox em cada linha da tabela desktop e em cada card mobile
- Quando há seleção, mostrar barra com contagem + botão "Excluir selecionados"
- Diálogo de confirmação antes de excluir
- Props: receber `onDeleteSelected` callback e `isDeletingSelected`

### `src/pages/Portaria.tsx`
- Integrar o novo hook `useDeleteVeiculosEsperados` e passar o callback para o painel

### RLS
A política `Admin/logistica delete veiculos_esperados` já permite exclusão para admin e logística. Se o perfil portaria também precisar excluir, será necessária uma migração para incluí-lo na policy.

2 arquivos alterados, 1 hook novo, possivelmente 1 migração.

