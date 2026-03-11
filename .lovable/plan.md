

# Página Exclusiva de Ruptura

## O que será feito

Criar uma página dedicada `/rupturas` que mostra apenas carregamentos em ruptura, com visão focada e navegação no sidebar.

## Implementação

### 1. Nova página `src/pages/Rupturas.tsx`
- Reutiliza `useCarregamentos` buscando todos os carregamentos do dia e filtrando `ruptura === true`
- Exibe tabela simplificada com colunas: Produto, Vendedor, Peso, Status, UF, Data
- KPI resumido no topo: total de rupturas, peso total em ruptura
- Filtros básicos: data, vendedor, status
- Permite alterar status e editar (mesmas permissões do painel principal)

### 2. `src/App.tsx`
- Adicionar rota `/rupturas` com `ProtectedRoute` (roles: admin, logistica, faturamento)

### 3. `src/components/AppSidebar.tsx`
- Adicionar item "Rupturas" no menu com ícone `AlertTriangle`, visível para admin, logistica e faturamento

## Arquivos (3)
1. `src/pages/Rupturas.tsx` — nova página
2. `src/App.tsx` — rota
3. `src/components/AppSidebar.tsx` — nav item

