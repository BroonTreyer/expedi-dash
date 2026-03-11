

# Filtro de Ruptura no Dashboard

## Problema
Não há filtro para visualizar apenas pedidos marcados como ruptura. O usuário precisa de uma forma fácil de identificar e filtrar esses itens.

## Solução

### 1. `src/components/dashboard/Filters.tsx`
- Adicionar um botão/toggle "Ruptura" nos filtros, ao lado dos existentes

### 2. `src/pages/Index.tsx`
- Adicionar `ruptura: "todos"` ao estado de filtros (valores: `"todos"`, `"sim"`, `"nao"`)
- Adicionar lógica de filtro: quando `ruptura === "sim"`, mostrar só itens com `ruptura === true`

## Arquivos (2)
1. `src/components/dashboard/Filters.tsx` — novo select de ruptura
2. `src/pages/Index.tsx` — lógica de filtro

