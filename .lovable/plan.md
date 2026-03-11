

# Usar StatusBadge quando usuário não pode alterar status

## Problema
Quando `canChangeStatus` é `false`, o status é renderizado como `<span className="text-sm">{c.status}</span>` — texto puro, sem cores. Deveria usar o componente `StatusBadge` para manter as cores.

## Mudança — `src/components/dashboard/CarregamentoTable.tsx`

Substituir todas as ocorrências de `<span className="text-sm">{c.status}</span>` (fallback do ternário `canChangeStatus`) por `<StatusBadge status={c.status} statusColors={statusColors} />`.

Existem 3 locais no desktop (single row, group summary row) e o mobile card já usa `StatusBadge`. Verificar e corrigir todos.

