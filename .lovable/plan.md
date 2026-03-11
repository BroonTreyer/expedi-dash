

# Atualizar permissões de acesso por perfil

## Regras
- **Logística**: Painel, Rupturas, Tipos de Caminhão
- **Faturamento**: Painel, Rupturas, Produtos, Vendedores, Clientes
- **Admin**: tudo (sem mudança)

## Arquivos (2)

### 1. `src/components/AppSidebar.tsx` — menu lateral
Atualizar o array `allNavItems` roles:
- `/tipos-caminhao`: adicionar `"logistica"`
- `/produtos`: adicionar `"faturamento"`
- `/vendedores`: adicionar `"faturamento"`
- `/clientes`: adicionar `"faturamento"`

### 2. `src/App.tsx` — rotas protegidas
Atualizar `allowedRoles` nas rotas:
- `/tipos-caminhao`: `["admin", "logistica"]`
- `/produtos`: `["admin", "faturamento"]`
- `/vendedores`: `["admin", "faturamento"]`
- `/clientes`: `["admin", "faturamento"]`

