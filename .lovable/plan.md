## Mudança

Em `src/components/portaria/CargasFechadasAguardandoPanel.tsx`, trocar o `formatDistanceToNow(...)` por um formato combinado de **dias + horas + minutos** usando `intervalToDuration` + `formatDuration` (date-fns, locale pt-BR), prefixado com "há".

Exemplos de saída:
- 45 min → `há 45 minutos`
- 5h 20min → `há 5 horas e 20 minutos`
- 1d 8h → `há 1 dia e 8 horas`
- 2d 3h 15min → `há 2 dias, 3 horas e 15 minutos`

Limitar as unidades a `["days", "hours", "minutes"]` para não mostrar segundos.

Mesma troca no `SolicitacoesPendentesPanel.tsx`, que hoje usa `formatDistanceToNow` e mostra apenas "cerca de X horas" sem dias precisos.

Nenhuma outra alteração.
