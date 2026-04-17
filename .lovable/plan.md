

## Bugs identificados

Olhando a screenshot e o código de `AppSidebar.tsx`:

1. **Ambos os itens ficam ativos ao mesmo tempo** (vermelho cheio em "Cadastros" e "Buscar/Consultar"):
   - "Cadastros" tem `to: "/cadastros"` — a checagem é `pathname === "/cadastros"` → **true** quando estou em `/cadastros?focus=buscar`.
   - "Buscar/Consultar" tem `to: "/cadastros?focus=buscar"` — a checagem usa `window.location.search` (não reativo ao React Router) e também acerta.
   - Resultado: os dois ligam o estilo `active`.

2. **Estilo ativo "vermelho cheio"** vem da classe `bg-sidebar-accent text-sidebar-primary` aplicada — isso é correto, mas como **dois itens** acendem juntos, parece bugado.

3. **Uso de `window.location.search`** dentro do render é frágil: não dispara rerender quando muda apenas a query string via `navigate()`.

## Correções

### `src/components/AppSidebar.tsx`

**(a) Substituir `window.location.search` por `useLocation().search`** — passar `search` como prop junto com `pathname` para `NavNodeRenderer`, garantindo reatividade.

**(b) Lógica de "active" exclusiva** quando duas folhas compartilham o mesmo `pathname`:
- Se o `to` da folha contém `?` → ativo somente quando `pathname + search` bate exatamente.
- Se o `to` da folha **não** contém `?` → ativo somente quando `pathname` bate **e** não há query string `focus=buscar` (ou seja, a "irmã" mais específica não está ativa).

Implementação simples: dentro do grupo Portaria, verificar se existe alguma folha irmã com query string que case com o location atual; se sim, a folha "base" (`/cadastros` puro) não fica ativa.

Forma genérica e segura:
```ts
const fullCurrent = pathname + search;
const active = node.to.includes("?")
  ? fullCurrent === node.to
  : pathname === node.to && !search.includes("focus="); // folha base só ativa quando não há focus
```

**(c)** Remover dependência de `window.location` (não reativa).

### Sem mudanças em
- Rotas, páginas, banco, permissões.
- Apenas `src/components/AppSidebar.tsx`.

### Resultado esperado
- Em `/cadastros` → só "Cadastros" fica vermelho.
- Em `/cadastros?focus=buscar` → só "Buscar/Consultar" fica vermelho.
- Grupo "Portaria" continua expandido em ambos os casos.

