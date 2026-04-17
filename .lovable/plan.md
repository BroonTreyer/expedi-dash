
User wants a "Buscar/Consultar" item inside the Portaria menu group in the sidebar. This should likely link to the Cadastros page's search functionality, or be a separate consultation page.

Looking at the current Cadastros page, it already has a search bar at the top. The simplest interpretation: add a new menu item "Buscar/Consultar" under Portaria that navigates to `/cadastros` with focus on the search, OR navigates to a route like `/cadastros?tab=buscar`.

Best approach: add it as a separate menu entry under Portaria pointing to `/cadastros` but with a query param `?modo=buscar` that the page reads to scroll/focus the search input. Cadastros stays as the unified form, Buscar/Consultar opens the same page focused on search.

Actually simpler — just add a sibling link `/cadastros?focus=buscar` and have the page auto-focus the search input when this param is present. Both items live under Portaria.

## Plano

### Estrutura final do menu Portaria
```text
▾ Portaria
   • Carga Própria
   • Terceirizados
   • Cadastros          → /cadastros (form unificado)
   • Buscar/Consultar   → /cadastros?focus=buscar  (mesma página, scroll + foco no campo de busca)
```

### Arquivos alterados

**1. `src/components/AppSidebar.tsx`**
- Adicionar nova folha `Buscar/Consultar` (ícone `Search`) dentro do grupo Portaria, logo abaixo de Cadastros.
- Roles: `admin, logistica, portaria`.
- `to: "/cadastros?focus=buscar"`.

**2. `src/pages/Cadastros.tsx`**
- Ler `useSearchParams()`; se `focus === "buscar"`, dar `ref.focus()` no input de busca e fazer `scrollIntoView({ behavior: "smooth", block: "start" })` no card de busca após mount.
- Adicionar `ref` no `Input` de busca.

### Sem mudanças em
- Rotas (`App.tsx`)
- Banco de dados / RLS
- Permissões
