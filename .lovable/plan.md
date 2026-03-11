

# Permitir editar cada item de um pedido agrupado

## Problema
Quando um pedido tem múltiplos itens (mesmo `numero_pedido`), o botão de editar no cabeçalho do grupo só abre o dialog com o primeiro item. Os itens expandidos não têm botão de edição individual.

## Solução

### 1. `src/components/dashboard/CarregamentoTable.tsx`
- Adicionar botões de ação (Editar, Excluir) em cada **child row** expandida, na última célula (que hoje é `<TableCell />` vazia na linha 464).
- Cada botão chamará `onEdit(c)` / `onDelete(c.id)` com o item específico daquela linha.
- Manter os botões do cabeçalho do grupo para ações no primeiro item (ou removê-los se preferir forçar edição individual).

### 2. `src/components/dashboard/CarregamentoDialog.tsx`
- Nenhuma mudança necessária — o dialog já funciona para editar um item individual (carrega `editing` como um único `Carregamento`).

### Resultado
Cada item expandido terá seus próprios botões de editar/excluir, permitindo edição independente de cada produto dentro do pedido agrupado.

## Arquivos (1)
- `src/components/dashboard/CarregamentoTable.tsx` — adicionar botões de ação nas child rows expandidas

