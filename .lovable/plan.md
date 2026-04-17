
User reports:
1. "Buscar/Consultar" no menu lateral não é clicável.
2. A busca também aparece dentro da página Cadastros — quer remover de lá e manter só via menu.

Causa do (1): no `AppSidebar.tsx`, o link foi adicionado com `to: "/cadastros?focus=buscar"`. O React Router `Link` aceita query strings, mas o problema é que estamos em `/cadastros?focus=buscar` e o `pathname === node.to` compara `"/cadastros"` com `"/cadastros?focus=buscar"` — nunca casa, então o estilo "ativo" não aplica, mas isso não deveria impedir clique. O real motivo provável: a rota atual já é a mesma URL, então clicar não dispara navegação. Além disso, sem hover visível pode parecer "não clicável". Vou trocar para usar objeto `{ pathname, search }` e separar `to`/`search` no nó.

Para (2): remover o card de busca da página `Cadastros.tsx`. A busca passa a ser exclusiva da rota `/cadastros?focus=buscar`, que renderizará a UI de busca em vez do form. Ou seja, a página passa a ter dois modos:
- `/cadastros` → form unificado de cadastro
- `/cadastros?focus=buscar` → tela de busca/consulta (somente leitura, com resultados clicáveis que abrem o form preenchido)

## Plano

### 1. `src/pages/Cadastros.tsx`
- Ler `useSearchParams()`. Se `focus === "buscar"`, renderizar **apenas** o card de busca (com resultados). Caso contrário, renderizar **apenas** o card de cadastro unificado.
- Remover o card de busca da view padrão.
- Ao clicar em um resultado da busca, navegar para `/cadastros` (sem query) com o registro pré-carregado via `state` do `useNavigate`, abrindo o form em modo edição.
- Remover o `useEffect` de auto-focus/scroll (não é mais necessário — a tela inteira é a busca).

### 2. `src/components/AppSidebar.tsx`
- Garantir que o link "Buscar/Consultar" funcione mesmo quando o usuário já está em `/cadastros`:
  - Ajustar a comparação de "ativo" para considerar a query string: comparar `pathname + search` em vez de só `pathname` quando o `to` contém `?`.
  - Usar `<Link to={{ pathname: "/cadastros", search: "?focus=buscar" }}>` para garantir navegação correta.
- Não mexer no resto da árvore.

### Sem mudanças em
- Rotas, banco, RLS, permissões, hooks.

### Resultado
- Menu Portaria → "Cadastros" abre o formulário.
- Menu Portaria → "Buscar/Consultar" abre exclusivamente a tela de busca.
- Página de cadastro fica limpa, sem o bloco de busca duplicado.
