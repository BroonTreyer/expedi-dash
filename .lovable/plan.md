

# Dar acesso de Faturamento ao perfil Logística

## O que muda

Logística passará a ter acesso às 3 páginas que hoje são exclusivas de Faturamento + Admin:

| Página | Antes | Depois |
|--------|-------|--------|
| Produtos | admin, faturamento | admin, **logistica**, faturamento |
| Vendedores | admin, faturamento | admin, **logistica**, faturamento |
| Clientes | admin, faturamento | admin, **logistica**, faturamento |

Logística mantém seus acessos exclusivos (Portaria, Caminhões, Tipos de Caminhão).

## Arquivos afetados

### `src/App.tsx`
- Adicionar `"logistica"` ao `allowedRoles` das rotas `/produtos`, `/vendedores` e `/clientes`

### `src/components/AppSidebar.tsx`
- Adicionar `"logistica"` ao array `roles` dos itens Produtos, Vendedores e Clientes

2 arquivos, 6 linhas alteradas.

