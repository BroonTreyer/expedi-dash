

# Corrigir acesso da Logística

## Problemas identificados

1. **Botões de editar/completar em grupos multi-item** — No grupo com vários itens, os botões de ClipboardCheck (completar logística) e Edit apenas expandem o accordion (`toggle()`), em vez de abrir o dialog. Para logística, o ClipboardCheck deveria abrir o dialog diretamente para o primeiro item (ou expandir para ação individual).

2. **Seleção de pedidos com soma** — Logística não tem mecanismo de checkbox para selecionar itens individuais e ver a soma do peso selecionado.

3. **Filtros restritos** — Para logística, os filtros devem ser apenas: Vendedor, Cliente (novo filtro) e UF (novo filtro). Remover data, etapa, status, ruptura, tipo caminhão e busca.

4. **Header da tabela fixo** — A linha de cabeçalho (Etapa, Status, Vendedor, etc.) precisa ficar fixa ao rolar verticalmente.

---

## Mudanças planejadas

### 1. `src/components/dashboard/Filters.tsx`
- Aceitar prop `userRole` opcional
- Quando `role === "logistica"`, renderizar apenas 3 filtros: Vendedor, Cliente (novo select baseado nos dados), UF (novo select com UF_LIST)
- Adicionar props `clientes` (lista de clientes) à interface

### 2. `src/pages/Index.tsx`
- Passar `role` e `clientes` para o componente `<Filters>`
- Adicionar filtros `cliente` e `uf` ao state de filtros
- Adicionar lógica de filtragem por `cliente` (codigo_cliente) e `uf`

### 3. `src/components/dashboard/CarregamentoTable.tsx`

**Botões de ação em grupo (linhas 463-469):**
- Para `canComplete` em grupo multi-item: abrir o dialog `onComplete(first)` diretamente em vez de `toggle()` — o usuário de logística precisa do dialog, não da expansão
- Para `canEdit` em grupo multi-item: manter toggle (editar é para faturamento/admin, faz sentido expandir)

**Seleção com checkbox (novo):**
- Adicionar prop `onSelectionChange?: (selectedIds: string[]) => void` e `selectable?: boolean`
- Estado interno `selected: Set<string>` com checkboxes na primeira coluna
- Checkbox no header para selecionar/desselecionar todos
- Quando `selectable` está ativo, mostrar checkboxes em cada linha

**Header sticky:**
- O `TableHeader` já tem `sticky top-3` — ajustar para `sticky top-0` agora que a proxy de topo foi removida

### 4. `src/pages/Index.tsx` (continuação)
- Quando `isLogistica`, passar `selectable={true}` para `CarregamentoTable`
- Manter estado `selectedIds` no Index
- Exibir um banner/card flutuante mostrando "X selecionados · Y kg" quando houver seleção

### 5. `src/components/dashboard/KpiCards.tsx`
- Aceitar prop opcional `selectedData` para quando houver seleção ativa, mostrar KPIs da seleção

---

## Resultado esperado
- Logística vê apenas filtros de Vendedor, Cliente e UF
- Botão de completar logística abre o dialog diretamente (não expande accordion)
- Checkboxes para selecionar pedidos com soma de peso visível
- Cabeçalho da tabela fixo ao rolar a página

