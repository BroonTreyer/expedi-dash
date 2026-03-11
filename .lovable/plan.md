

# Ajustes na Página de Rupturas e Sidebar

## Mudanças

### 1. `src/components/AppSidebar.tsx`
- Mover o item "Rupturas" para logo abaixo de "Painel" (posição 2 no array `allNavItems`)

### 2. `src/pages/Rupturas.tsx`
- Importar `useCreateCarregamento`
- Adicionar botão "Novo Pedido (Ruptura)" no header, ao lado do título
- Ao clicar, abrir o `CarregamentoDialog` no modo `vendas` com `ruptura` pré-marcado como `true`
- No `onSubmit`, usar `createMut` quando não há `editing` (novo pedido) e `updateMut` quando há (edição)
- O pedido criado já virá com `ruptura: true` automaticamente

### 3. `src/components/dashboard/CarregamentoDialog.tsx`
- Aceitar nova prop opcional `defaultRuptura?: boolean`
- Quando `defaultRuptura` é `true` e não está editando, inicializar `form.ruptura = true`

## Arquivos (3)
1. `src/components/AppSidebar.tsx` — reordenar nav
2. `src/pages/Rupturas.tsx` — botão criar + useCreateCarregamento
3. `src/components/dashboard/CarregamentoDialog.tsx` — prop defaultRuptura

