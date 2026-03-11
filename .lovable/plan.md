

# Cenário de Ruptura — Marcar Item como Ruptura

## O que muda

Adicionar um campo booleano `ruptura` na tabela `carregamentos_dia` e uma indicação visual clara na tabela e no kanban quando um item está em ruptura de estoque.

## Banco de dados

### Migration
- Adicionar coluna `ruptura boolean not null default false` na tabela `carregamentos_dia`

## Código

### 1. `src/hooks/useCarregamentos.ts`
- Adicionar `ruptura: boolean` ao type `Carregamento`

### 2. `src/components/dashboard/CarregamentoTable.tsx`
- Na linha do item, quando `ruptura === true`:
  - Adicionar ícone de alerta (ex: `AlertTriangle` do lucide) com cor amarela/laranja
  - Aplicar estilo visual diferenciado na row (ex: `bg-amber-50/50` ou borda lateral)
- No mobile card, exibir badge "Ruptura" visível

### 3. `src/components/dashboard/CarregamentoDialog.tsx`
- Adicionar checkbox/switch "Ruptura de estoque" nos modos `vendas` e `editar`
- Enviar campo `ruptura` no submit

### 4. `src/components/dashboard/KanbanView.tsx`
- Exibir indicador de ruptura nos cards do kanban

### 5. `src/components/dashboard/KpiCards.tsx`
- Adicionar KPI card mostrando quantidade de itens em ruptura

### 6. `src/lib/constants.ts`
- Nenhuma alteração necessária (ruptura é um flag, não um status)

## Arquivos (5)
1. `src/hooks/useCarregamentos.ts` — tipo
2. `src/components/dashboard/CarregamentoTable.tsx` — visual
3. `src/components/dashboard/CarregamentoDialog.tsx` — checkbox
4. `src/components/dashboard/KanbanView.tsx` — visual
5. `src/components/dashboard/KpiCards.tsx` — KPI

