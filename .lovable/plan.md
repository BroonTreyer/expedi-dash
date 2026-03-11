

# Reorganizar primeira linha do formulário: Data, N° Pedido, UF

## Mudança
No `CarregamentoDialog.tsx`, mover os 3 campos (Data, N° Pedido, UF) para a primeira linha do formulário, nessa ordem, usando grid de 3 colunas.

## Arquivo: `src/components/dashboard/CarregamentoDialog.tsx`

- Mudar o grid container de `grid-cols-1 sm:grid-cols-2` para suportar 3 colunas na primeira linha
- Agrupar Data + N° Pedido + UF em um `div` com `sm:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4` como primeira entrada
- Ordem: Data → N° Pedido → UF
- Remover o campo UF e N° Pedido das posições atuais (estão separados no grid)

