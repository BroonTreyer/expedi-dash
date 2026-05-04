
# Roadmap Carga Própria — 4 ondas

Cada onda é entregue como um único PR. Onda só começa quando a anterior está validada em produção. Total estimado: ~21 problemas distribuídos.

---

## Onda 1 — Críticos (parar o sangramento) ✅ ENTREGUE

Objetivo: dados deixam de corromper hoje. Sem refatoração, só cirurgia.

### Entregue
- ✅ **A1** Validação de KM (front + trigger SQL `validate_km_rodado`): bloqueia `km_final < km_inicial` e diferença > 3000 km. Aplicado em `RegistroMovimentoDialog`, `EditMovimentoDialog` e no banco.
- ✅ **A2** Migração normalizou os 18 registros impossíveis (saída+chegou) → entrada+chegou ou finalizado conforme presença de `horario_saida_final`/`km_final`. Verificado: 0 registros restantes.
- ✅ **A3** `PortariaKpiCards.noPatio` agora conta Carga Própria por `etapa_carga_propria ∈ {chegou, em_rota, retornou}` independente do `tipo_movimento`, com dedup por placa+carga_id.
- ✅ **A4** Helper único `buildCargaPropriaPayload()` em `src/lib/carga-propria-criar.ts`. Os 4 caminhos consumem (Portaria.tsx, useRegistrarChegadaPortaria, useRegistrarChegadaWalkIn, RegistroEntradaDialog, RegistroMovimentoDialog). Carga Própria sempre nasce como `entrada + chegou` (ou já `em_rota` se foto de painel/KM vier preenchida no mesmo formulário).
- ✅ **A6** Trigger `set_horario_saida_on_finalizado` corrigido: só preenche `horario_saida_final` quando etapa = `finalizado`. Removidos os ramos `em_rota` e `retornou` que fechavam o ciclo cedo.
- ✅ **A9** `EditMovimentoDialog` agora itera apenas `finalFields` (campos exibidos), não mais `EDITABLE_FIELDS` inteiro. Inclui validação de KM idêntica.

### Resíduo conhecido (não bloqueia)
- 6 registros legados com `km_rodado < 0` continuam no banco. Não foram normalizados em massa porque não há fonte da verdade para reconstruir KM. Operador pode corrigir um a um — agora o trigger impede que reapareçam.

---

## Onda 2 — Alto (latentes, vão estourar com volume) ✅ ENTREGUE

### Entregue
- ✅ **A5** `handleSaidaRapida` em `PatioAtualTab` agora finaliza Carga Própria (`etapa_carga_propria='finalizado'` + `horario_saida_final`).
- ✅ **A8** `VISIBILITY_SAIDA_ROTA` em `portaria-fields-config.ts` — saída p/ rota deixa de herdar `VISIBILITY` e pede só foto do painel + km_inicial + opcionais (rota/peso/qtd/km_rota/observações).
- ✅ **A10** `EditMovimentoDialog`: campo `categoria` removido dos editáveis e exibido como read-only. Cascata `categoria→etapa_*` removida.
- ✅ **B7** PatioAtualTab detecta CP sem `horario_entrada` (não-finalizado), exibe badge "Estado inconsistente" no card/linha e loga warn no console.
- ✅ **C1** RPC `reabrir_como_walk_in(p_movimento_id, p_categoria_destino, p_grupo)` SECURITY DEFINER faz INSERT esperado + INSERT chegada + DELETE original em uma transação. Hook `useReabrirComoWalkIn` chama a RPC.
- ✅ **C2** `liberarEntrada` em `CargasFechadasAguardandoPanel` agora filtra `id` + `ilike placa` quando há placa.
- ✅ **D1** Trigger `validate_etapa_carga_propria` (BEFORE INSERT/UPDATE) rejeita qualquer valor fora de `{chegou, em_rota, retornou, finalizado}`.

### Critérios de aceite — verificados
- Saída rápida em Carga Própria fecha o ciclo e some do pátio. ✅
- INSERT/UPDATE com `etapa_carga_propria='foo'` é rejeitado pelo banco. ✅
- Reabertura walk-in: tudo ou nada (transação SQL). ✅

---

## Onda 3 — Médio (UX, robustez) ✅ ENTREGUE (parcial)

### Entregue
- ✅ **B3** `window.confirm` em `desfazerChegada` substituído por `AlertDialog` shadcn com cópia explícita.
- ✅ **B4** Walk-in CP não recebe transportadora (handlers `handleSelectCaminhao` e `handleSelectMotorista` ignoram quando `grupo === "PRÓPRIA"`).
- ✅ **B5** Toast contextual: CP recebe "Chegada registrada — veículo no pátio" + descrição do próximo passo.
- ✅ **B6** `transportadora` digitada por engano em CP é propagada para `empresa` (não perde info na auditoria).
- ✅ **C3** Antes do DELETE de chegadas órfãs, atualiza `observacoes` com motivo (carga reaproveitada + janela de dedup).
- ✅ **C4** `useStatusPortariaPorCarga` aceita `{ janelaAntesHoras, janelaDepoisHoras }` (default 12/48); janela vira parte da queryKey.
- ✅ **C5** Janela de dedup em `RegistroEntradaDialog` parametrizada via `DEDUP_WINDOW_HOURS = 12` (era 4h hardcoded).
- ✅ **C6** `useMovimentacoesAtivasPatio` pré-computa `tsFinalPorPlaca: Map<string, number>`; lookup O(1) substitui `irmaos.some()` em loop.
- ✅ **D2** Trigger `validate_horarios_ordem` rejeita: entrada<chegada, saída<chegada/entrada, retorno<saída_rota, saída_final<retorno/chegada (tolerância 60s).
- ✅ **D3** `chegou` agora é opção válida no select `etapa_carga_propria` da edição.
- ✅ **D4** `useReabrirComoWalkIn` aceita `categoria`. RPC `reabrir_como_walk_in` ajustada para criar registro CP correto (`etapa_carga_propria='chegou'` + `horario_entrada` preenchido). `podeReabrirRegistro` libera CP em etapa `chegou` sem carga.

### Adiado para Onda 4
- **B1+B2** Extração `<AcoesCargaPropria>` (refatoração visual pura, sem impacto funcional).

### Critérios de aceite — verificados
- Nenhum `window.confirm` no módulo Portaria. ✅
- Banco rejeita ordem cronológica inválida via trigger. ✅
- CP pode ser reaberto como walk-in (admin/logística). ✅

---

## Onda 4 — Estrutural (anti-reincidência) ✅ ENTREGUE

### Entregue
- ✅ **E1** Criada FSM `src/lib/carga-propria-fsm.ts` com `nextEtapa()`, `assertTransicao()`, `etapaEfetiva()`, `isFinalizada()`. `RegistroMovimentoDialog` (3 transições) e `PatioAtualTab` (saída rápida + 2 badges) consomem a FSM. Transições inválidas falham cedo no front e no banco (trigger D1).
- ✅ **E2** `EtapaCargaPropria = "chegou"|"em_rota"|"retornou"|"finalizado"` e `EtapaTerceirizado = "chegada"|"no_patio"|"carregando"|"finalizado"` exportadas em `useMovimentacoesPortaria.ts`. Tipos fortes pegaram **2 bugs latentes**: comparações `etapa_terceirizado === "em_rota"` em `useMotoristasPainel.ts` e `EmRotaAgoraPanel.tsx` que nunca matchavam — corrigidas para usar apenas `etapa_carga_propria`.
- ✅ **E3** Migração normalizou os 155 registros legados de Carga Própria que tinham `tipo_movimento='saida'` para `'entrada'`, preenchendo `horario_entrada` quando vazio. Trigger de ordem cronológica suspenso temporariamente durante o backfill (são dados pré-Onda 1 com horários inconsistentes de origem desconhecida).
- ✅ **E4** `useStatusPortariaPorCarga` já estabilizava `idsKey` via `useMemo` ordenado — verificado, sem mudança necessária.
- ✅ **E6** `parseDataReferencia` agora usa `EXCEL_EPOCH_OFFSET = 25569` e limite superior dinâmico `today_serial + 365*5`, com comentário explicando os limites.
- ✅ **E7** Comentário "legacy saida with prefill" em `RegistroMovimentoDialog.tsx` substituído por explicação atualizada apontando para a FSM como fonte da verdade.

### Adiado
- **E5** RPC `get_movimento_full(id)` — não há gargalo medido em `MovimentoDetailsDialog` no momento; promovido para roadmap geral de performance.
- **B1+B2** Extração `<AcoesCargaPropria>` (refatoração visual pura) — promovida para roadmap de UI.

### Critérios de aceite — verificados
- Buscar `etapa_carga_propria = ` no projeto retorna apenas FSM, helper de criação e componentes de UI/comparação (sem lógica de transição duplicada). ✅
- TS pega erro se for escrito `'em-rota'` ou `'finalizada'` (typo) em qualquer lugar tipado. ✅ (validado: a tipagem flagrou 2 bugs reais durante o build)
- Banco rejeita transição/etapa inválida via triggers `validate_etapa_carga_propria` + `validate_horarios_ordem`. ✅

---

## Cronograma sugerido

| Onda | Quando | Risco | Bloqueia operação? |
|---|---|---|---|
| 1 | Imediato | Médio (mexe em criação) | Não — fallback compatível |
| 2 | Após 1 estabilizar (~3 dias) | Baixo | Não |
| 3 | Em paralelo a 2 (UX puro) | Muito baixo | Não |
| 4 | Após 1+2 em prod | Baixo (refatoração) | Não |

---

## Notas técnicas

- Toda migração SQL nova passa por trigger validation (não CHECK constraint), conforme padrão do projeto.
- Helpers e FSM ficam em `src/lib/` para serem importáveis tanto por componentes quanto por hooks.
- Cada onda inclui um teste manual scriptado (lista de cenários a validar em preview antes de publicar).

---

Aprovar para começar pela Onda 1, ou quer ajustar escopo de alguma onda antes?
