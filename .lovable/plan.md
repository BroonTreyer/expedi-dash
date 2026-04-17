
## Diagnóstico

Duas barras de scroll vertical em `/clientes`:
1. **Outer**: `<div className="flex-1 flex flex-col h-screen overflow-auto">` no `Layout.tsx` — wrapper já tem `overflow-auto`.
2. **Inner**: `<main className="flex-1 overflow-auto">` dentro do mesmo wrapper — segundo scroll.

Ambos têm `overflow-auto` e o conteúdo (página Clientes com tabela longa + paginação) excede a altura → cada um renderiza sua própria scrollbar.

Aparece em todas as páginas longas, não só Clientes — o usuário só notou agora.

## Plano

Remover o `overflow-auto` duplicado. Manter no `<main>` (mais semântico, deixa o header fixo no topo) e tirar do wrapper externo.

### Mudança
`src/components/Layout.tsx`:
- `<div className="flex-1 flex flex-col h-screen overflow-auto ...">` → `<div className="flex-1 flex flex-col h-screen overflow-hidden ...">`
- Manter `<main className="flex-1 overflow-auto">` como o único scroll container.

Benefício extra: headers (mobile e desktop toggle) ficam fixos no topo enquanto só o conteúdo rola.

## Arquivos
- ✏️ `src/components/Layout.tsx` — trocar `overflow-auto` por `overflow-hidden` no wrapper externo
