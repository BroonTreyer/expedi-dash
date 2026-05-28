## Objetivo

No card "Cargas fechadas aguardando veículo", reorganizar para que a data da carga apareça junto do horário de chegada dentro do badge âmbar "Aguardando liberação", prefixada por **"Chegou"**.

Exemplo: `⏳ Aguardando liberação · Chegou 27/05 08:52 (1411min)`

## Mudança

Arquivo: `src/components/portaria/CargasFechadasAguardandoPanel.tsx`

1. Dentro do badge "Aguardando liberação" (linhas ~261-272), trocar o texto atual `· {hora} ({minEspera}min)` por `· Chegou {dd/MM} {hora} ({minEspera}min)`, usando `c.data` (ISO `YYYY-MM-DD`) formatado como `dd/MM` em pt-BR.

2. Remover o badge separado de data (linhas ~288-290, `🕐 2026-05-27`) **apenas** quando a carga estiver em "Aguardando liberação", já que a data passou a estar no badge de chegada. Para cargas que ainda não chegaram, manter o badge atual da data.

Nenhuma alteração de lógica, hooks ou banco — só reorganização visual.
