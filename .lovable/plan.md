## Diagnóstico

Carga **CF FRANGO** (data 15/05) foi fechada hoje (19/05). Walk-in do Raimundo (placa RBK7D22) foi registrado pela portaria em 17/05 e vinculado à carga no fechamento. Mesmo assim, a carga não aparece no card azul de **Portaria → Terceirizado** por dois motivos:

1. **Janela do painel é só 2 dias.** O hook `useCargasFechadasAguardando` em `src/hooks/useCarregamentos.ts` filtra `carregamentos_dia.data >= hoje - 2 dias`. CF FRANGO (`data=15/05`) cai fora.
2. **Painel exige `movimentacoes_portaria`.** Para mostrar como "chegou aguardando liberação" (azul) o painel precisa achar uma `entrada` em `movimentacoes_portaria`. O walk-in do Raimundo não tem essa linha (foi criado por outro fluxo). Hoje sem essa movimentação a carga ficaria invisível ou no máximo laranja.

## Correção (frontend apenas, em `src/hooks/useCarregamentos.ts`)

**1) Ampliar a janela do painel para 7 dias.**
Trocar `since.setDate(since.getDate() - 2)` por `- 7`. Alinha com `useCargasFechadasParaVincular` e com a janela de 7 dias já usada em outros pontos (busca de walk-ins, vínculo tardio etc.).

**2) Considerar walk-in autorizado como "chegou aguardando liberação".**
No mesmo hook, depois de buscar as cargas fechadas, buscar `veiculos_esperados` onde:
- `carga_id IN (cargaIds)`
- `walk_in = true`
- `conferido = false`
- `status_autorizacao IN ('autorizado','aguardando_vinculo','aguardando_autorizacao')`

Se a carga não tem `entrada` em `movimentacoes_portaria` mas tem um walk-in nessas condições, marcar `chegouAguardandoLiberacao = true` e usar `autorizado_em` (ou `created_at`) como `horarioChegada`. `movimentoChegadaId` permanece `null` — o botão "Liberar entrada no pátio" usa o walk-in id como fallback (a função `liberarChegada` já tem o caminho de walk-in via `veiculos_esperados`).

## O que NÃO mexer

- Trigger `on_carga_fechada` (já corrigido).
- Lógica de `finalizadaKey` (continua válida).
- Outros hooks/painéis.

## Validação

1. Recarregar `/portaria/terceirizado` — a carga **CF FRANGO / RBK7D22** deve aparecer como **card azul** com botão "Liberar entrada no pátio".
2. Clicar em "Liberar entrada no pátio" deve criar/atualizar a movimentação e o card sair do painel para o "Pátio Atual".
3. Cargas fechadas há até 7 dias continuam aparecendo; mais antigas continuam sumindo.
4. Cargas fechadas hoje (`data = hoje`) com chegada registrada normalmente continuam azuis como antes (sem regressão).

## Arquivos

- `src/hooks/useCarregamentos.ts` (alterações cirúrgicas no `useCargasFechadasAguardando`).
- Nenhum outro arquivo precisa mudar.
