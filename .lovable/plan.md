

# Corrigir Responsividade do Layout Principal

## Problema

O viewport atual e 1042px, mas o sidebar ocupa 240px (`w-60`), deixando apenas ~802px para o conteudo. Os breakpoints Tailwind (como `lg:` = 1024px) se aplicam ao viewport total, nao ao espaco disponivel. Isso causa:

1. **KPI Cards**: `lg:grid-cols-6` tenta encaixar 6 cards em ~802px -- ficam comprimidos
2. **Filtros**: larguras fixas (`md:w-[150px]`, `md:w-[170px]` x4) somam ~830px, transbordando o espaco disponivel

## Solucao

### `src/components/dashboard/KpiCards.tsx`
- Mudar de `lg:grid-cols-6` para `xl:grid-cols-6`, adicionando `lg:grid-cols-3` como intermediario
- Grid: `grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-6`

### `src/components/dashboard/Filters.tsx`
- Reduzir larguras fixas dos selects: `md:w-[150px]` ao inves de `md:w-[170px]`
- Data: `md:w-[140px]`
- Usar `lg:flex-nowrap` para manter em linha apenas em telas maiores
- Manter `flex-wrap` em `md` para quebrar naturalmente

## Arquivos (2)
1. `src/components/dashboard/KpiCards.tsx`
2. `src/components/dashboard/Filters.tsx`

