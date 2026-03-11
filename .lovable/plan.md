

# Fixar Menu Lateral (Sticky Sidebar)

## Problema
O sidebar rola junto com o conteúdo da página, perdendo acesso rápido à navegação.

## Solução

### `Layout.tsx`
- O sidebar já está com `fixed` no mobile. No desktop, ele usa `md:relative` — trocar para manter fixo.
- Adicionar `margin-left` no conteúdo principal para compensar a largura do sidebar fixo.
- O conteúdo principal deve ter `overflow-auto` e `h-screen` para scroll independente.

### `AppSidebar.tsx`
- Garantir `h-screen overflow-y-auto` no `<aside>` para scroll interno caso o menu seja maior que a tela.

## Arquivos (2)
1. `src/components/Layout.tsx`
2. `src/components/AppSidebar.tsx`

