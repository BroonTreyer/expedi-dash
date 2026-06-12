## Problema

Na aba **Pátio** de Distribuidores estão aparecendo cards com badges **"Aguardando vínculo"** e **"Aguardando Liberação"** (Welliton/RMB0C89 com 985h, Thiago/SE06H14). Esses veículos **não estão fisicamente no pátio** — são registros de chegada na portaria que ainda nem entraram. Como eles também aparecem nos painéis vermelho ("Aguardando vínculo da Logística") e azul ("Liberar entrada no pátio"), o mesmo motorista é contado/exibido 2x.

Regra correta: **Pátio = somente veículos com entrada física confirmada** (`horario_entrada` preenchido e não finalizado). Tudo que está aguardando vínculo ou aguardando liberação deve viver apenas nos painéis acima (vermelho/azul), nunca na lista do Pátio.

## Mudanças

### 1. `src/components/portaria/PatioAtualTab.tsx`

No `useMemo` `veiculosNoPatio`:

- **Remover** o branch que mantinha `terceirizado` em `etapa_terceirizado='chegada'` SEM `carga_id` visível aqui (linhas ~150‑160 e o filtro `isTerceirizadoAguardandoVinculo`). Esses passam a ser responsabilidade exclusiva do `SolicitacoesPendentesPanel` (card vermelho "Aguardando vínculo da Logística").
- Endurecer o filtro: para `terceirizado`, exigir `horario_entrada IS NOT NULL` e `etapa_terceirizado` em `{'no_patio','liberado','carregando', ...}` (qualquer coisa exceto `'chegada'` e `'finalizado'`).
- Para `carga_propria`, manter a regra atual (já exige saída/etapa progressiva), mas excluir registros sem `horario_entrada` que ainda estejam em `aguardando_liberacao`/`chegou` sem entrada (pertencem ao painel azul).
- Como agora nenhum registro "aguardando vínculo/liberação" entra na lista, a **dedupe por placa** vira redundante; pode ser removida (ou mantida só como cinto de segurança, sem prioridade especial).

Ajustar também a ordenação `sortedVeiculos`: remover o `sort` que jogava cards "Aguardando vínculo" para o topo (não existem mais aqui).

Os blocos de UI em `PatioAtualTab.tsx` que renderizam os badges "Aguardando vínculo" (~linha 459 e 706) e "Aguardando Liberação" (~linha 464 e 711) podem permanecer no código como fallback defensivo — só não serão alcançados em fluxo normal.

### 2. `src/pages/Portaria.tsx` — badge da aba "Pátio"

Aplicar a mesma regra ao `counts.patio` (~linha 120‑160) para o número da aba bater com a lista renderizada. Remover a contagem de terceirizados em `chegada` sem `carga_id` e de registros sem `horario_entrada`.

## Resultado esperado

- Aba **Pátio** mostra apenas Welliton/Thiago/Rodrigo se eles realmente entraram no pátio (têm `horario_entrada`). Os registros órfãos sem entrada somem daqui.
- Rodrigo (ONC6549, `carga_id` nulo, sem `horario_entrada`) continua visível **apenas** no painel vermelho **"Aguardando vínculo da Logística"** acima da aba. Quando a Logística vincular uma carga a ele, ele migra automaticamente para o painel azul **"Liberar entrada no pátio"** — comportamento que já existe e não precisa mexer.
- Sem duplicidade entre painéis acima e a aba Pátio.

## Fora de escopo

- Não mexer no schema, RLS, nem nos painéis vermelho/azul.
- Não apagar registros antigos do banco (Welliton de 985h, etc.). Eles simplesmente deixam de poluir a aba Pátio; a Logística decide o destino via "Vincular carga" ou "Recusar" no painel vermelho.
