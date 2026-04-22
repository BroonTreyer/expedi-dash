

## Correções de layout e responsividade

### Problemas identificados

**1. Analytics — Header (mobile)**
- Botões "Hoje/Ontem" estão `hidden sm:flex` → invisíveis no mobile mesmo sendo o filtro mais pedido pelo usuário.
- Select de período tem `w-44` fixo → pode estourar a linha em telas pequenas.

**2. Analytics — TabsList (mobile)**
- 5 abas com ícone + texto em uma única linha sem scroll horizontal → estoura ou comprime ilegível em telas <640px.

**3. Analytics — KPIs Rupturas (mobile)**
- Grid `grid-cols-2 sm:grid-cols-3 lg:grid-cols-6` com cards de `p-4` e `text-2xl` → números longos como `123.456 kg` quebram/transbordam.
- Falta `truncate` / tabular tight nos valores grandes.

**4. Analytics — Tabela "Clientes Afetados" / "Cargas com Pendência" (mobile <1024px)**
- Tabelas com 4 colunas dentro de Card sem `overflow-x-auto` → conteúdo é cortado/comprimido.
- Coluna "Produtos" com `line-clamp-2` ainda pode empurrar layout.

**5. Analytics — BarChart vertical "Top Produtos" (mobile)**
- `YAxis width={120}` é grande demais em telas estreitas — sobra pouquíssimo espaço para a barra.
- Mesmo problema no chart de Vendedores (`width={100}`).

**6. EditarCargaDialog — Linha de peso/motivo (mobile)**
- Layout `flex flex-wrap items-center gap-2` com Label inline + Input + texto + Select dispara quebras feias.
- Em telas estreitas, "→ Ruptura parcial: 3000 kg" e o Select de motivo ficam "soltos" abaixo do peso.
- Diálogo `max-w-4xl max-h-[90vh]` OK, mas footer com 3 botões grandes (`Desfazer carga (5 pedidos voltam para Vendas)`) estoura no mobile — texto não trunca.

**7. Rupturas — KPIs (mobile)**
- Card "Não Carregado" tem `text-2xl` + "TON" + linha extra "kg" → estoura altura comparada aos outros 3 cards (alinhamento ruim).
- `truncate` no valor pode cortar "1.234,5 TON" em 360px.

**8. Rupturas — Tabela "Resumo por Produto" desktop**
- Coluna "Cargas Afetadas" com vários `Badge` lado a lado pode estourar a largura, sem max-width nem wrap controlado (já tem `mr-1 mb-0.5` mas falta limite).

**9. Layout — header desktop ocioso**
- `src/components/Layout.tsx` desktop header tem `h-10` mas só contém o toggle e o sino — espaço desperdiçado, e não tem padding lateral consistente com o sidebar colapsado.

### Mudanças

#### `src/pages/Analytics.tsx`

- **Header:** trocar `hidden sm:flex` dos botões Hoje/Ontem por sempre visível em uma segunda linha no mobile. Estrutura nova: 2 linhas no mobile (título + linha de ações com `flex-wrap`); 1 linha no desktop.
- **Select período:** `w-full sm:w-44` para crescer no mobile.
- **TabsList:** envolver em `<div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">` com `flex-nowrap`, e nas TabsTrigger esconder o texto no mobile (`<span className="hidden sm:inline">Visão Geral</span>`) deixando só o ícone — padrão já usado no projeto.
- **KPIs Rupturas:** mudar para `grid-cols-2 sm:grid-cols-3 xl:grid-cols-6` (igual aos KPIs principais) com `text-xl sm:text-2xl`, `p-3 sm:p-4`, `truncate` no número e `tabular-nums tracking-tight`.
- **Tabelas Clientes/Cargas:** envolver `<Table>` em `<div className="overflow-x-auto">` e adicionar `min-w-[460px]` na Table para forçar scroll horizontal limpo no mobile em vez de quebrar células.
- **BarChart vertical:** `YAxis width={typeof window !== 'undefined' && window.innerWidth < 640 ? 80 : 120}` ou usar hook `useIsMobile` (já existe) para reduzir width a 70 no mobile e fontSize 8.
- **Tooltip cliente:** truncar nome longo + mostrar código abaixo (já está OK, só ajustar `max-w` para `max-w-[140px] sm:max-w-[180px]`).

#### `src/components/dashboard/EditarCargaDialog.tsx`

- **Linha de peso/motivo:** trocar `flex flex-wrap items-center gap-2` por grid responsivo:
  ```text
  Mobile: empilhado (peso input full | original em linha | parcial+select em linha)
  Desktop: tudo em linha (peso | original | →ruptura parcial | motivo)
  ```
  Estrutura: `<div className="grid grid-cols-1 sm:grid-cols-[auto_1fr_auto] sm:items-center gap-2 pl-1">`.
- **Diálogo:** `max-w-4xl w-[calc(100vw-1rem)]` e `max-h-[95vh]` no mobile para usar mais espaço.
- **Footer:** `sm:justify-between` mantido; trocar texto longo "Desfazer carga (5 pedidos voltam para Vendas)" por versão curta no mobile via `<span className="hidden md:inline">…</span>` e "Desfazer carga" sozinho no mobile. Mesma coisa para "Inverter ordem".
- **Botões Salvar/Cancelar:** `flex-col-reverse sm:flex-row gap-2` para empilhar no mobile.

#### `src/pages/Rupturas.tsx`

- **Card KPI "Não Carregado":** quebrar em 2 linhas balanceadas — valor principal `text-base sm:text-xl` (cabe melhor) com unidade " TON" inline, segunda linha em kg em texto auxiliar. Adicionar `min-h-[68px] sm:min-h-[88px]` em todos os 4 cards para alinhar alturas mesmo com conteúdo diferente.
- **Tabela "Cargas Afetadas":** wrapper da coluna `<div className="flex flex-wrap gap-1 max-w-[260px]">` para limitar quebra horizontal.

#### `src/components/Layout.tsx`

- **Header desktop:** reduzir altura para `h-9`, dar padding consistente `px-3` e dar a opção de mostrar título da página (deixar só o toggle + sino atual, mas ajustar padding).

### O que NÃO muda

- Hooks, queries, lógica de cálculos, banco, RLS.
- Layout das demais abas do Analytics (Visão Geral, Expedição, Vendedores, Geografia) — já estão bem.
- Página Portaria, Caminhões, Cadastros, etc.
- Comportamento dos filtros e exports CSV.

### Arquivos afetados

- `src/pages/Analytics.tsx` — header responsivo, TabsList scrollável, KPIs Rupturas, tabelas com scroll, charts mais compactos no mobile.
- `src/components/dashboard/EditarCargaDialog.tsx` — linha de peso/motivo responsiva, footer enxuto no mobile.
- `src/pages/Rupturas.tsx` — alinhamento de KPIs, badges com max-width.
- `src/components/Layout.tsx` — pequeno ajuste no header desktop.

### Resultado

- Mobile (320–640px): TabsList rolável horizontalmente; KPIs sem estouro; tabelas com scroll lateral próprio; botões Hoje/Ontem visíveis.
- Tablet (640–1024px): grid 3 colunas para KPIs Rupturas; tabelas lado a lado.
- Desktop (≥1024px): inalterado, apenas refinos de espaçamento.
- EditarCargaDialog usável no celular sem quebra do form de peso/motivo.

