

# Melhorias de usabilidade sugeridas

Após analisar o painel, filtros, tabela, sidebar e fluxos, identifiquei as seguintes oportunidades:

---

## 1. Botão "Limpar Filtros"
Hoje, quando o usuário aplica vários filtros, precisa resetar cada um manualmente. Adicionar um botão "Limpar filtros" ao lado dos filtros quando qualquer filtro estiver ativo.

**Arquivo:** `src/components/dashboard/Filters.tsx`
- Detectar se algum filtro difere do padrão
- Renderizar botão discreto "Limpar filtros" com ícone X que reseta todos de volta ao padrão

---

## 2. Estado vazio mais informativo
A mensagem "Nenhum carregamento encontrado" é genérica. Melhorar com ícone ilustrativo e texto contextual (ex.: "Nenhum resultado para os filtros aplicados" vs "Nenhum carregamento para esta data").

**Arquivo:** `src/components/dashboard/CarregamentoTable.tsx`
- Diferenciar "sem dados no dia" vs "filtros sem resultado"
- Adicionar ícone (PackageSearch) e call-to-action

---

## 3. Atalho de navegação por data (Hoje / Ontem / Amanhã)
O campo `<input type="date">` é funcional, mas lento para navegar entre dias. Adicionar botões rápidos "← Ontem | Hoje | Amanhã →" ao lado do date picker.

**Arquivo:** `src/components/dashboard/Filters.tsx`
- Botões com setas para dia anterior/próximo
- Botão "Hoje" para voltar à data atual rapidamente

---

## 4. Indicador de contagem nos filtros ativos
Mostrar badges com contagem de filtros ativos no cabeçalho, facilitando ao usuário perceber que há filtros aplicados.

**Arquivo:** `src/components/dashboard/Filters.tsx`
- Pequeno badge numérico indicando quantos filtros estão ativos

---

## 5. Tooltip nos KPIs com explicação
Os cards de KPI mostram valores mas não explicam o que representam. Adicionar tooltip com descrição breve ao passar o mouse.

**Arquivo:** `src/components/dashboard/KpiCards.tsx`
- Envolver cada card com `Tooltip` explicando o significado (ex.: "Peso total de todos os pedidos do dia")

---

## Resumo de escopo

| Melhoria | Arquivo principal |
|---|---|
| Limpar filtros | `Filters.tsx` |
| Estado vazio contextual | `CarregamentoTable.tsx` |
| Navegação rápida por data | `Filters.tsx` |
| Badge de filtros ativos | `Filters.tsx` |
| Tooltips nos KPIs | `KpiCards.tsx` |

Todas as mudanças são incrementais e não alteram lógica de negócio ou banco de dados.

