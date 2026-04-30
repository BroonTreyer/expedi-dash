## Problemas a corrigir

### 1) Carga muda de dia ao marcar como "Carregado"

**Causa:** o status "Carregado" não move a carga — o que move é a `data` do pedido. Hoje a carga `JR MIX` está com `data = 29/04` no banco, mas você está vendo no dia 30 graças ao **carry-over** (`data < hoje AND status != 'Carregado'`). No instante em que você clica "Carregado", a regra do carry-over falha (status passou a ser `Carregado`) e a linha some de "hoje", aparecendo só no dia 29 (a data real de cadastro).

**Correção:**
- Em `useConsolidado` (`src/pages/Consolidado.tsx`), expandir o carry-over para também trazer cargas dos últimos 30 dias **finalizadas hoje** (carregadas com data antiga, mas cuja conclusão é de hoje).
- Critério prático: incluir cargas com `data < hoje` se houve **movimento de portaria** (`horario_entrada`, `horario_saida_final` ou status `expedido/carregando/no_patio`) **no dia atual** OU se `updated_at >= início_do_dia_hoje` E status mudou para `Carregado`.
- Implementar via duas consultas combinadas: a query atual + uma busca por `carga_id`s presentes em `movimentacoes_portaria` com `data_hora >= today` e `categoria = 'terceirizado'`. Unir e deduplicar.
- Mesma lógica em `useCargasDiaExpedicao` (`src/hooks/useCargasDiaExpedicao.ts`) para o painel de Expedição.
- Acrescentar badge sutil "Carga de 29/04 — operada hoje" para o usuário entender que a data oficial não muda, só a visibilidade.

**Alternativa oferecida (precisa decisão):**
- (A) Manter a `data` original do pedido e usar carry-over como acima (recomendado, preserva histórico fiscal/contábil).
- (B) Quando a carga chega no pátio em outro dia, atualizar automaticamente `data = CURRENT_DATE` em todos os itens da carga (mais simples, mas reescreve histórico). 

Vou implementar (A) por padrão; se preferir (B), aviso antes de aplicar.

### 2) Fluxo de chegada/entrada/saída do terceirizado precisa registrar 3 horários distintos

Hoje só existem 2 timestamps reais (`horario_entrada` e `horario_saida_final`). O `horario_chegada` é copiado do `veiculos_esperados.created_at` no momento que a portaria libera, perdendo separação semântica entre "chegou na portaria" e "entrou no pátio".

**Estado atual:**
- Portaria registra chegada → cria `veiculos_esperados` walk-in (`aguardando_vinculo`).
- Logística vincula carga → `status_autorizacao = autorizado` (carga aparece em "Cargas vinculadas — clique para liberar entrada").
- Portaria libera → cria `movimentacoes_portaria` com chegada e entrada juntas e marca `conferido=true`.
- Saída → registrada normalmente.

**Correção:**
- Quando a portaria registrar a chegada do walk-in, **já criar** uma linha em `movimentacoes_portaria` com:
  - `tipo_movimento = 'entrada'`
  - `etapa_terceirizado = 'chegada'`
  - `horario_chegada = now()`
  - `horario_entrada = NULL`
  - sem `carga_id` (será preenchido quando logística vincular)
- Quando a logística vincular a carga, **fazer UPDATE** nessa movimentação setando `carga_id` (sem mexer em horários nem etapa).
- Quando a portaria clicar "Liberar Entrada no Pátio", **fazer UPDATE** setando `horario_entrada = now()` e `etapa_terceirizado = 'no_patio'`.
- Saída continua igual: cria movimentação `tipo_movimento = 'saida'` vinculada, com `horario_saida_final`. Ao finalizar, copiar `horario_saida_final` para a entrada e setar `etapa_terceirizado = 'finalizado'`.
- O painel "Aguardando vínculo da Logística" passa a olhar `movimentacoes_portaria` com `etapa_terceirizado = 'chegada'` e `carga_id IS NULL` (em vez de `veiculos_esperados`), garantindo que o cronômetro mostra **tempo desde a chegada física**, não desde o cadastro do walk-in.
- O painel "Cargas vinculadas — clique para liberar entrada" olha `etapa_terceirizado = 'chegada'` com `carga_id NOT NULL`.

**Resultado visível ao usuário:**
- Tempo "Chegou" = `horario_chegada → now()` (enquanto não entrar)
- Tempo "Aguardando liberação" = `horario_chegada → horario_entrada` (após entrar)
- Tempo "No pátio" = `horario_entrada → horario_saida_final`
- Tempo total = `horario_chegada → horario_saida_final`

### 3) Compatibilidade com walk-ins já existentes

Manter `veiculos_esperados` como fonte para previsões importadas via planilha e como referência histórica. O fluxo walk-in passa a usar `movimentacoes_portaria` como fonte primária; `veiculos_esperados` continua existindo apenas para o caso de chegada **prevista** (planilha) — sem mudar nada nelas.

Para os walk-ins ativos no banco hoje (status `aguardando_vinculo` sem movimentação), na primeira liberação o sistema migra criando a movimentação de chegada retroativa com `horario_chegada = veiculos_esperados.created_at`.

## Arquivos a alterar

- `src/hooks/useCarregamentos.ts` — `useConsolidado`/`useCargasFechadasAguardando`: incluir carry-over por movimentação de portaria do dia.
- `src/hooks/useCargasDiaExpedicao.ts` — mesma expansão para Expedição.
- `src/hooks/useVeiculosEsperados.ts` — `useRegistrarChegadaWalkIn` passa a criar movimentação de chegada; `useRegistrarChegadaPortaria` passa a fazer UPDATE; `useAutorizarChegada` passa a fazer UPDATE da movimentação ao vincular carga.
- `src/components/portaria/SolicitacoesPendentesPanel.tsx` — listas vêm de `movimentacoes_portaria` e mostram tempo desde chegada física correto.
- `src/components/portaria/CargasFechadasAguardandoPanel.tsx` — `liberarEntrada` segue funcionando, mas com semântica clara (UPDATE da movimentação existente).
- `src/components/portaria/PatioAtualTab.tsx` — exibir 3 timestamps + 3 durações.
- `src/components/portaria/MovimentoDetailsDialog.tsx` — mostrar timeline Chegou → Entrou → Saiu.
- `src/pages/Consolidado.tsx` e `src/pages/Expedicao.tsx` — badge "operada hoje" para carga com data anterior.

## Resultado esperado

- Marcar carga do dia 29 como "Carregado" no dia 30 não esconde a carga da tela do dia 30.
- Registro de chegada cria de imediato a movimentação com horário real de chegada na portaria.
- Vínculo de carga apenas anexa o `carga_id` à movimentação existente.
- Liberação no pátio grava o horário de entrada efetiva.
- Saída grava horário de saída final.
- Cronômetros mostram tempos corretos por etapa.
