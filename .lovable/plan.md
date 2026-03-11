

# Cadastro de Clientes e Código do Cliente

## O que será feito

1. Criar tabela `clientes` no banco com campos: código, nome, ativo
2. Criar hook `useClientes` (CRUD) seguindo o padrão de `useVendedores`
3. Criar página `Clientes` seguindo o padrão de `Vendedores`
4. Adicionar item "Clientes" no sidebar (admin only)
5. Adicionar rota `/clientes` no App.tsx
6. Atualizar `CarregamentoDialog`: campo "Cód. Cliente" que auto-preenche o nome do cliente (mesmo padrão do vendedor)
7. Adicionar coluna `codigo_cliente` na tabela `carregamentos_dia` para referência

## Arquivos

1. **Migração SQL** — criar tabela `clientes` + coluna `codigo_cliente` em `carregamentos_dia` + RLS policies
2. **`src/hooks/useClientes.ts`** — useClientes, useCreateCliente, useUpdateCliente, useDeleteCliente
3. **`src/pages/Clientes.tsx`** — CRUD de clientes (padrão Vendedores)
4. **`src/App.tsx`** — rota `/clientes`
5. **`src/components/AppSidebar.tsx`** — item "Clientes" no menu
6. **`src/components/dashboard/CarregamentoDialog.tsx`** — campo "Cód. Cliente" com auto-preenchimento + select de clientes

### Tabela `clientes`
```text
id          uuid PK default gen_random_uuid()
codigo_cliente  text NOT NULL UNIQUE
nome_cliente    text NOT NULL
ativo       boolean default true
created_at  timestamptz default now()
```

### Lógica no Dialog
Mesmo padrão do vendedor: campo "Cód. Cliente" que ao digitar o código busca e preenche o nome automaticamente, mais um select para escolha manual. O campo `cliente` existente será mantido mas preenchido a partir do cadastro.

