## Mudança

Em `src/components/portaria/SolicitacoesPendentesPanel.tsx` (linha 190), incluir a data antes da hora no badge "Chegou":

- Antes: `Chegou 09:47 (há cerca de 23 horas)`
- Depois: `Chegou 27/05 09:47 (há cerca de 23 horas)`

Formato `dd/MM` via `format(new Date(v.created_at), "dd/MM HH:mm", { locale: ptBR })`.

Nenhuma outra alteração.
