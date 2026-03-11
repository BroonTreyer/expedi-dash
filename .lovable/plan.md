

# Melhorar Responsividade Completa do Sistema

## Problemas Identificados

### 1. Painel Principal (Index)
- **Header**: botoes "Tabela/Kanban" e "Novo Pedido" quebram em telas pequenas
- **Filters**: filtros com larguras fixas (`w-[150px]`, `w-[170px]`, `w-[200px]`) transbordam em mobile
- **CarregamentoTable**: tabela com 15+ colunas sem scroll horizontal adequado; impossivel ler em mobile
- **KanbanView**: `grid-cols-2` em mobile com 6 colunas de status comprime demais
- **KpiCards**: valores de peso longos podem transbordar nos cards

### 2. Páginas CRUD (Produtos, Vendedores, TiposCaminhao)
- Header com titulo + botao lado a lado quebra em mobile
- Busca com `w-72` fixa nao se adapta
- Padding fixo `p-6` sem variacao mobile
- Tabelas sem overflow horizontal controlado

### 3. Usuarios
- Ja tem `p-4 md:p-6` (OK), mas tabela precisa de scroll horizontal em mobile

### 4. CarregamentoDialog
- Grid de produtos `grid-cols-[1fr_1.5fr_80px_100px_32px]` nao funciona em mobile
- `grid-cols-2` no formulario principal precisa ser `grid-cols-1` em mobile
- `max-w-2xl` OK mas conteudo interno transborda

### 5. Layout/Sidebar
- Sidebar ja tem tratamento mobile (OK)

### 6. Auth
- Ja responsiva com `max-w-md` e `p-4` (OK)

---

## Alteracoes Planejadas

### `src/pages/Index.tsx`
- Header: `flex-col` em mobile com gap, botoes em linha separada
- Ja tem `flex-col sm:flex-row` (OK, apenas ajustar)

### `src/components/dashboard/Filters.tsx`
- Remover larguras fixas, usar `w-full sm:w-auto` e `min-w-0`
- Wrap em container com `flex-wrap` (ja tem)
- Em mobile, filtros ocupam largura total com grid

### `src/components/dashboard/CarregamentoTable.tsx`
- Em mobile, transformar em cards empilhados ao inves de tabela
- Manter tabela em desktop com `overflow-x-auto`
- Usar hook `useIsMobile` para alternar

### `src/components/dashboard/KanbanView.tsx`
- Em mobile: `grid-cols-1` com colunas em scroll horizontal ou accordion
- Ajustar para `grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6`

### `src/components/dashboard/KpiCards.tsx`
- Ajustar texto para truncar em mobile; `text-lg` ao inves de `text-xl` em mobile

### `src/components/dashboard/CarregamentoDialog.tsx`
- Form grid: `grid-cols-1 sm:grid-cols-2`
- Produtos grid: empilhado verticalmente em mobile
- Garantir que dialog use altura adequada

### `src/pages/Produtos.tsx`
- Padding: `p-4 md:p-6`
- Header: `flex-col sm:flex-row` com gap
- Busca: `w-full sm:w-72`
- Tabela: `overflow-x-auto` no container

### `src/pages/Vendedores.tsx`
- Mesmas correcoes que Produtos

### `src/pages/TiposCaminhao.tsx`
- Mesmas correcoes; remover `max-w-lg` fixo (usar `max-w-full sm:max-w-lg`)

### `src/pages/Usuarios.tsx`
- Header: `flex-col sm:flex-row`
- Tabela com overflow ja tem `overflow-auto` (OK)

### `src/components/dashboard/StatusSelect.tsx`
- `min-w-[120px]` ao inves de `min-w-[140px]` para economizar espaco

---

## Arquivos Alterados (10 arquivos)
1. `src/components/dashboard/Filters.tsx`
2. `src/components/dashboard/CarregamentoTable.tsx`
3. `src/components/dashboard/KanbanView.tsx`
4. `src/components/dashboard/KpiCards.tsx`
5. `src/components/dashboard/CarregamentoDialog.tsx`
6. `src/components/dashboard/StatusSelect.tsx`
7. `src/pages/Index.tsx`
8. `src/pages/Produtos.tsx`
9. `src/pages/Vendedores.tsx`
10. `src/pages/TiposCaminhao.tsx`

