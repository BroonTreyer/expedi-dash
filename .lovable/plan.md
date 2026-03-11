

# Unificar visualmente linhas do mesmo pedido

## Problema
Linhas com o mesmo `numero_pedido` aparecem como rows separadas com bordas entre elas. Em pedidos grandes com muitos produtos, isso gera bagunça visual.

## Solução
Para linhas agrupadas (mesmo `numero_pedido`), remover a borda entre elas e mostrar o número do pedido apenas na primeira linha do grupo. Campos compartilhados (vendedor, caminhão, motorista, cliente, UF, status, etapa) ficam visíveis só na primeira linha — nas demais, células ficam vazias para reduzir ruído.

## Mudanças — `CarregamentoTable.tsx`

**Desktop (tabela):**
- Linhas agrupadas (`isGrouped`): remover `border-b` para eliminar separador entre itens do mesmo pedido
- Primeira linha do grupo (`isNewGroup`): manter borda superior destacada
- Células compartilhadas (N° Pedido, Etapa, Status, Vendedor, Caminhão, Motorista, Cliente, UF): renderizar conteúdo só na primeira linha do grupo; nas seguintes, célula vazia
- Apenas Cód. Produto, Produto, Qtd, Peso, Início, Fim, Obs variam por linha
- Background sutil no grupo inteiro (não só nas linhas "grouped")

**Mobile (cards):**
- Agrupar cards do mesmo pedido dentro de um container com borda, mostrando o número do pedido como header do grupo

## Arquivo (1)
- `src/components/dashboard/CarregamentoTable.tsx`

