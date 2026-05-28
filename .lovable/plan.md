## Mudança

Em `src/components/portaria/CargasFechadasAguardandoPanel.tsx`, dentro do badge "Aguardando liberação", substituir o sufixo `({minEspera}min)` por `formatDistanceToNow(new Date(c.horarioChegada), { addSuffix: true, locale: ptBR })` (resultado: "há cerca de 23 horas"), padronizando com o painel de solicitações pendentes.

Mantém o restante do badge: `· Chegou 27/05 08:52 (há cerca de 23 horas)`.

Adicionar imports de `formatDistanceToNow` (date-fns) e `ptBR` (date-fns/locale). O texto auxiliar "Aguardando há {minEspera}min" abaixo dos botões pode continuar como está (referência rápida para o porteiro).
