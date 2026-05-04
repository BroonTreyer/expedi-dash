Auditoria completa do módulo Carga Própria. Encontrei 21 problemas distribuídos entre bugs funcionais, inconsistências de dados, riscos de concorrência, falhas de UX e dívidas estruturais.

---

## A. Bugs funcionais críticos (afetam dados e operação)

### A1. Cálculo de `km_rodado` aceita valores absurdos (negativos/milhões)
- Arquivo: `src/components/portaria/RegistroMovimentoDialog.tsx` linhas 283–286 e 317–319; `src/components/portaria/EditMovimentoDialog.tsx` linhas 78–80.
- A subtração `km_final - km_inicial` é feita sem nenhuma validação. O banco tem 6 registros reais com `km_rodado` negativo (de -7.881 a -7.438.475 km). Exemplos: placa OGR6D47 com -7.438.475; NGL0B87 com -263.326.
- Causa: motorista ou portaria digitam errado, sistema persiste sem alertar.
- Impacto: KPIs de combustível e analytics quebram silenciosamente.

### A2. Etapa `chegou` em registros com `tipo_movimento = 'saida'` (estado impossível)
- 18 registros no banco com `tipo_movimento='saida'` AND `etapa_carga_propria='chegou'`. Exemplos: EJW3H18 (28/04), OND0B48 (26/04), NVP6191 (25/04).
- Causa provável: criação inicial sempre forçada como `saida` (`RegistroMovimentoDialog` linhas 322–327 — `isCargaPropriaPrimeiraSaida`) combinada com correções recentes que setam `etapa_carga_propria='chegou'` em outro caminho. Os dois caminhos colidem.
- Impacto: aparece de forma errada em filtros (KPI "No Pátio" usa `tipo_movimento='entrada'` — esses registros somem do pátio mas continuam ativos).

### A3. KPI "No Pátio" ignora Carga Própria com `tipo_movimento='saida'`
- Arquivo: `src/components/portaria/PortariaKpiCards.tsx` linhas 24–30.
- O cálculo só considera `entradas`. Cargas Próprias criadas via "primeira saída" (`isCargaPropriaPrimeiraSaida` em `RegistroMovimentoDialog`) ficam com `tipo_movimento='saida'` e nunca contam aqui, mas aparecem na tabela `PatioAtualTab` (linhas 115–117). Resultado: KPI subestima a quantidade real de veículos.

### A4. Dois caminhos paralelos criam Carga Própria de forma divergente
- `RegistroMovimentoDialog.tsx` (linhas 322–386): cria como `tipo_movimento='saida'` + `etapa='em_rota'` direto (pula "chegou").
- `Portaria.tsx` `openRegistroFromVeiculoEsperado` (linhas 140–156): cria como `tipo_movimento='entrada'` + `etapa='chegou'`.
- `useRegistrarChegadaWalkIn`/`useRegistrarChegadaPortaria` (`useVeiculosEsperados.ts`): cria como `entrada` + `chegou`.
- `RegistroEntradaDialog.tsx` linhas 122–141: cria como `entrada` + `chegou`.
- Esses 4 fluxos não compartilham helper. Qualquer correção precisa ser duplicada e acaba divergindo (foi exatamente isso que causou o problema repetido das últimas mensagens).

### A5. `handleSaidaRapida` (PatioAtualTab) cria saída sem fechar etapa de Carga Própria
- `PatioAtualTab.tsx` linhas 160–204. Ao clicar em "Saída" rápida, cria `tipo_movimento='saida'` vinculado à entrada. Para Terceirizado marca a entrada como `finalizado`. Para Carga Própria não marca nada → registro fica preso em `chegou`/`em_rota` no pátio mesmo após a saída.

### A6. Trigger `set_horario_saida_on_finalizado` dispara `horario_saida_final` em `em_rota`
- Migração `20260430204636`: a função BEFORE UPDATE preenche `horario_saida_final` quando a etapa vai para `em_rota`, `retornou` ou `finalizado`.
- Mas o fluxo de UI de Lacre (etapa `finalizado`) também escreve `horario_saida_final = now()` (linhas 304 do dialog). Quando a UI passa por `em_rota`→`retornou`→`finalizado`, `horario_saida_final` é setado já em `em_rota` e nunca atualizado → `formatTempo` em `MovimentoDetailsDialog` mostra o horário errado e `computeTempos` calcula tempo total subestimado.

### A7. `useStatusPortariaPorCarga` ainda referencia `aguardando_liberacao`
- `useStatusPortariaPorCarga.ts` linha 72. Já normalizamos o banco e o código de criação, mas este derivador ainda mantém o ramo. Ele nunca dispara, mas mascara o estado real para qualquer registro legado que venha a aparecer em consultas históricas.

### A8. `validateForm` permite avançar `saida_rota` sem KM Inicial obrigatório
- `portaria-fields-config.ts` linhas 195–201: `getMatrix("saida_rota")` retorna `VISIBILITY` (matriz de entrada). Para `entrada` de Carga Própria, `km_inicial` é `obrigatorio`. Está correto, mas: o tipo `saida_rota` herda a matriz de entrada — se um dia a regra for "entrada de carga própria não pede KM" (caso comum em terceirizado), quebra. Risco de manutenção.

### A9. `EditMovimentoDialog` apaga campos não-listados
- `EditMovimentoDialog.tsx` linhas 63–82. Ao salvar, faz `updates[f.key] = null` para todo campo `EDITABLE_FIELDS` que esteja vazio na tela. Como o dialog mostra só campos que têm valor (linhas 87–104) MAS o `updates` itera sobre `EDITABLE_FIELDS` inteiro, qualquer campo não exibido vira `null` no UPDATE. Risco real: editar uma observação apaga `etapa_carga_propria` se ele não estiver entre os "core" exibidos para aquele registro.

### A10. `EditMovimentoDialog` permite trocar categoria sem migrar campos
- `EditMovimentoDialog.tsx` linhas 137–149. Trocar de `terceirizado` para `carga_propria` zera `etapa_terceirizado` e seta `etapa_carga_propria='chegou'`, mas não move `horario_real_saida`, não recria `horario_chegada`, não cria registro espelho. O movimento fica órfão.

---

## B. Bugs de UX / fluxo

### B1. Botão "Saída p/ Rota" (fallback) chamado em estados desconhecidos
- `PatioAtualTab.tsx` linhas 530–533 (desktop) e 376–379 (mobile). Para qualquer Carga Própria que não case com `chegou`/`em_rota`/`retornou`, mostra "Saída p/ Rota" / "Saída c/ KM" — inconsistência visual entre as duas views.

### B2. Dois textos diferentes para a mesma ação ("Retorno" vs "Registrar Retorno", "Saída c/ KM" vs "Saída p/ Rota")
- Mobile e desktop em `PatioAtualTab.tsx` divergem entre si. Causa confusão para o operador que alterna entre celular e desktop.

### B3. Confirmação de exclusão usa `window.confirm()`
- `CargasFechadasAguardandoPanel.tsx` linha 184 (`desfazerChegada`). O resto do app usa `AlertDialog` shadcn. Quebra padrão visual e bloqueia a thread.

### B4. Walk-in de Carga Própria força grupo "WALK-IN-PROPRIA" mas trigger SQL renomeia se houver transportadora
- `RegistroEntradaDialog.tsx` linha 210 + trigger `normalize_veiculo_esperado_grupo` (db). Operador pode preencher transportadora por engano em Carga Própria → o registro vira terceirizado silenciosamente e desaparece da aba Carga Própria.

### B5. Mensagem de sucesso desalinhada
- `Portaria.tsx` linha 186: `toast.success("Chegada de ${placa} registrada! Aguardando liberação no pátio.")` — mas para Carga Própria já entra direto no pátio (não aguarda liberação). Texto enganoso.

### B6. `RegistroEntradaDialog` ignora `transportadora` ao gravar Carga Própria com carga vinculada
- Linhas 136–141: condicional `if (categoria === "terceirizado")` define `empresa = transportadora`. Para Carga Própria não copia. Se o operador cadastrou transportadora no caminhão (caso de fretado pontual), informação é descartada.

### B7. Botão "Liberar Entrada" aparece teoricamente para Carga Própria via dados antigos
- `PatioAtualTab.tsx` linha 219: `isAguardandoLiberacao` retorna `false` para Carga Própria, mas o BUTTON em linha 360 / 514 está dentro de `aguardandoLib ? ... : ...`. Se `horario_entrada` for nulo por bug, a tag "Aguardando Liberação" + botão "Liberar Entrada" aparecem em terceirizado. Não há fallback nem aviso quando essa combinação inválida ocorre em Carga Própria.

---

## C. Riscos de concorrência e dados

### C1. `useReabrirComoWalkIn` deleta movimentação antes de garantir o INSERT no destino
- `useVeiculosEsperados.ts` linhas 582–622. Faz INSERT em `veiculos_esperados` → INSERT em `movimentacoes_portaria` → DELETE da original. Não está em transação. Se o segundo INSERT falhar, sobra um walk-in fantasma + movimento original; se o DELETE falhar, fica duplicado.

### C2. `liberarEntrada` em `CargasFechadasAguardandoPanel` faz UPDATE em massa por `carga_id`
- Linhas 160–172. `update veiculos_esperados ... .eq("carga_id", c.carga_id).eq("conferido", false)` aplica em todas as linhas com aquele carga_id. Se o `carga_id` foi reutilizado entre cargas (ocorre — ver `useCarregamentos.ts` 508–514 que faz a mesma defesa), marca conferido o veículo errado.

### C3. `handleSubmitVinculadoACarga` apaga "fantasmas" sem auditoria
- `RegistroEntradaDialog.tsx` linhas 148–155: apaga registros pendentes da mesma placa sem registrar quem nem por quê. O trigger `audit_movimentacoes` registra DELETEs (ok), mas não há observação humana do "porquê".

### C4. Janela operacional de `useStatusPortariaPorCarga` fixa em 12h-48h
- Linhas 161–169. Carga Própria que sai 23:50 e volta dois dias depois cai fora da janela de 48h → status fica "expedido" sem refletir o retorno. Impacto baixo hoje, mas estrutural.

### C5. Dedup de chegadas usa `since4h` arbitrário
- `RegistroEntradaDialog.tsx` linha 110. Se a chegada foi registrada há mais de 4h (motorista chegou e dormiu no caminhão), cria duplicata. Janela hard-coded sem justificativa documentada.

### C6. `useMovimentacoesAtivasPatio` busca 7 dias e processa client-side
- `useMovimentacoesPortaria.ts` linhas 131–235. Em produção isso é OK por enquanto, mas o filtro de "ciclos posteriores finalizados" (linhas 188–214) faz O(N²) por placa. Vai degradar quando volume crescer.

---

## D. Inconsistências de schema/contrato

### D1. Não existe constraint no banco para os valores válidos de `etapa_carga_propria`
- Permite gravar qualquer string. Hoje há ramo legado `aguardando_liberacao` que já não deveria existir mas ainda é aceito.
- Sugestão: enum Postgres ou CHECK constraint via trigger (não imutável).

### D2. Campos `horario_chegada`, `horario_entrada`, `horario_real_saida`, `horario_real_retorno`, `horario_saida_final` não têm regra de ordenação
- Banco aceita `horario_real_saida < horario_chegada`. Nenhum trigger valida.

### D3. `EDITABLE_FIELDS` permite editar `etapa_carga_propria` para `em_rota`/`retornou`/`finalizado` mas não `chegou`
- `EditMovimentoDialog.tsx` linha 41. Se um operador setou errado e quer voltar para `chegou`, não consegue.

### D4. Mensagem `useReabrirComoWalkIn` só funciona para `terceirizado`
- Linhas 605–616: insere com `categoria: "terceirizado"` hard-coded. Carga Própria não pode ser "reaberta como walk-in", mesmo que o caso de uso exista (operador deletou carga).

---

## E. Dívidas estruturais (não-bugs, mas fragilizam o módulo)

### E1. Lógica de máquina de estados dispersa
- A FSM da Carga Própria (chegou → em_rota → retornou → finalizado) está implementada em pelo menos 7 lugares:
  `RegistroMovimentoDialog`, `PatioAtualTab` (desktop+mobile), `Portaria.openRegistroFromVeiculoEsperado`, `CargasFechadasAguardandoPanel.liberarEntrada`, `useRegistrarChegadaPortaria`, `useRegistrarChegadaWalkIn`, `useStatusPortariaPorCarga.deriveEtapa`.
- Sugestão: extrair para `src/lib/carga-propria-fsm.ts` com `nextStage(current, action)` + `assertTransition()`.

### E2. Tipo `MovimentacaoPortaria` aceita `string` para etapas
- `useMovimentacoesPortaria.ts` linhas 61–63. Deveria ser union literal `"chegou" | "em_rota" | "retornou" | "finalizado" | null`. TS não pega erros de digitação hoje.

### E3. `tipo_movimento: "saida"` para criar Carga Própria é semanticamente errado
- O banco usa "entrada"/"saida" como movimento físico. Carga Própria moderna deveria ser sempre `entrada` + `etapa`. Hoje cria como `saida` em alguns paths. Isso confunde KPIs e relatórios CSV.

### E4. Realtime channels recriados em todo render no `useStatusPortariaPorCarga`
- Já tem proteção, mas subscreve novo canal por `idsKey` mudando — em telas com filtros dinâmicos pode subir e descer canal várias vezes.

### E5. `MovimentoDetailsDialog` faz 3 queries separadas (movimento, esperado, related)
- Pode ser uma RPC única. Hoje aceita, mas com volume escala mal.

### E6. `parseDataReferencia` aceita Excel serial entre 40000 e 60000 (range arbitrário)
- `useVeiculosEsperados.ts` linhas 425–429. Datas após 2064 falham em silêncio.

### E7. Comentário em `RegistroMovimentoDialog` linha 134 ("Carga própria não tem 'entrada'") contradiz a normalização atual
- Após as últimas mudanças, Carga Própria PODE entrar como `entrada`+`chegou`. O comentário está desatualizado e induz quem mantiver o código a errar.

---

## Resumo executivo

- **Crítico (A1, A2, A3, A4, A6, A9):** corrigem dados quebrando hoje em produção.
- **Alto (A5, A8, A10, B7, C1, C2, D1):** falhas latentes que vão aparecer com volume.
- **Médio (B1, B2, B3, B4, B5, B6, C3, C4, C5, C6, D2, D3, D4):** UX e robustez.
- **Estrutural (E1–E7):** refatorações para evitar reincidência (especialmente E1, que foi causa raiz dos últimos 4 chamados de "ele tá pulando etapa").

Total: **21 problemas** identificados nesta auditoria.

Quer que eu ataque tudo de uma vez (uma série de PRs grandes), priorize só os críticos (A1–A6, A9) ou monte um roadmap em ondas (Crítico → Alto → Médio → Estrutural)?