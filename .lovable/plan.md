

# Corrigir contagem de Pedidos no Consolidado

## Problema
Todos os registros têm `numero_pedido = NULL`, então a contagem baseada em `numero_pedido` distintos resulta em 0. Os dados não possuem esse campo preenchido.

## Solução
Alterar a contagem de "Pedidos" para contar o **número total de linhas (itens)** por carga, já que cada linha representa um item/pedido. Isso afeta:

### `src/pages/Consolidado.tsx`

1. **`groupByCarga`**: Remover a lógica de `pedidosMap` com `Set<number>`. Em vez disso, definir `qtdPedidos = g.items.length` após o loop (ou simplesmente usar `items.length` diretamente).

2. **KPI `totalPedidos`**: Trocar a contagem de `numero_pedido` únicos para somar `g.items.length` de todos os grupos (ou contar total de `filtered.length`).

3. **`printData`**: Já usa `g.qtdPedidos`, então será corrigido automaticamente.

