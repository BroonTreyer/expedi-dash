
# Roadmap Carga Própria — 4 ondas

Cada onda é entregue como um único PR. Onda só começa quando a anterior está validada em produção. Total estimado: ~21 problemas distribuídos.

---

## Onda 1 — Críticos (parar o sangramento) 

Objetivo: dados deixam de corromper hoje. Sem refatoração, só cirurgia.

### O que entra
- **A1** Validação de `km_rodado`: bloquear `km_final < km_inicial`, alertar se diferença > 2.000 km. Aplicado em `RegistroMovimentoDialog.tsx` e `EditMovimentoDialog.tsx`. Trigger SQL espelho como segunda barreira.
- **A2** Limpeza de 18 registros impossíveis (`tipo_movimento='saida'` + `etapa='chegou'`) via migração: normalizar para `entrada`/`finalizado` conforme `horario_saida_final`.
- **A4** Centralizar criação de Carga Própria em um helper único `criarMovimentoCargaPropria()` em `src/lib/carga-propria-criar.ts`. Os 4 caminhos (`RegistroMovimentoDialog`, `Portaria.openRegistroFromVeiculoEsperado`, `useRegistrarChegadaPortaria/WalkIn`, `RegistroEntradaDialog`) passam a chamar o helper. Garante `entrada` + `chegou` sempre.
- **A6** Ajustar trigger `set_horario_saida_on_finalizado`: só preencher `horario_saida_final` quando etapa for `finalizado` (remover ramos `em_rota` e `retornou`).
- **A9** `EditMovimentoDialog`: parar de iterar `EDITABLE_FIELDS` e setar `null`. Fazer diff só dos campos efetivamente exibidos no formulário.
- **A3** KPI "No Pátio" passa a contar Carga Própria por `etapa_carga_propria IN ('chegou','em_rota','retornou')` independente do `tipo_movimento`.

### Critérios de aceite
- Zero registros com `tipo_movimento='saida' AND etapa_carga_propria='chegou'` após migração.
- Não consigo salvar `km_final < km_inicial` na UI.
- Os 4 fluxos de criação produzem registro idêntico (mesmo shape).
- KPI "No Pátio" bate com a contagem da tabela `PatioAtualTab`.

---

## Onda 2 — Alto (latentes, vão estourar com volume)

### O que entra
- **A5** `handleSaidaRapida` em `PatioAtualTab`: para Carga Própria, marcar `etapa_carga_propria='finalizado'` + `horario_saida_final=now()` na entrada original.
- **A8** Refatorar `portaria-fields-config.ts` para que `saida_rota` tenha matriz própria (não herdar de `entrada`).
- **A10** `EditMovimentoDialog`: bloquear troca de categoria. Se necessário, exigir reabertura via fluxo dedicado.
- **B7** Tratar combinação inválida (Carga Própria sem `horario_entrada`): exibir aviso "Estado inconsistente — abra o registro para corrigir" e logar.
- **C1** `useReabrirComoWalkIn`: envolver os 3 passos numa RPC SQL transacional `reabrir_como_walk_in(movimento_id)`.
- **C2** `liberarEntrada` em `CargasFechadasAguardandoPanel`: filtrar também por `placa` além de `carga_id`, eliminando risco de carga_id reutilizado.
- **D1** Adicionar trigger `validate_etapa_carga_propria` (BEFORE INSERT/UPDATE) limitando aos 4 valores válidos (`chegou`, `em_rota`, `retornou`, `finalizado`).

### Critérios de aceite
- "Saída rápida" em Carga Própria fecha o registro e some do pátio.
- Tentativa de gravar etapa inválida via SQL é rejeitada.
- Reabertura como walk-in: ou completa tudo ou não altera nada.

---

## Onda 3 — Médio (UX, robustez)

### O que entra
- **B1+B2** Unificar copy e botões entre mobile e desktop em `PatioAtualTab.tsx`. Extrair `<AcoesCargaPropria etapa={...}/>` reutilizado nas duas views.
- **B3** Substituir `window.confirm` em `CargasFechadasAguardandoPanel` por `AlertDialog` shadcn.
- **B4** Walk-in Carga Própria: bloquear no front o preenchimento de transportadora; trigger SQL emite warning ao invés de renomear silenciosamente.
- **B5** Toast contextual: "Chegada registrada — veículo no pátio" para Carga Própria; manter texto atual para Terceirizado.
- **B6** `RegistroEntradaDialog`: copiar `transportadora` para `empresa` também em Carga Própria quando preenchida.
- **C3** `handleSubmitVinculadoACarga`: registrar motivo da exclusão de fantasmas em `observacoes_internas` antes do DELETE.
- **C4** `useStatusPortariaPorCarga`: tornar janela configurável (parâmetro), default 72h.
- **C5** Janela de dedup em `RegistroEntradaDialog`: parametrizar (default 12h, justificado em comentário).
- **C6** `useMovimentacoesAtivasPatio`: substituir loop O(N²) por `Map<placa, ciclos>` indexado.
- **D2** Trigger `validate_horarios_ordem` em `movimentacoes_portaria`: rejeitar `horario_real_saida < horario_chegada` etc.
- **D3** `EDITABLE_FIELDS`: incluir `chegou` como destino válido.
- **D4** Permitir reabrir Carga Própria como walk-in (parametrizar `categoria`).

### Critérios de aceite
- Mobile e desktop com texto e ações idênticos para cada etapa.
- Nenhum `window.confirm` no módulo Portaria.
- Zero erros de ordem cronológica de horários no banco.

---

## Onda 4 — Estrutural (anti-reincidência)

Esta onda é o seguro contra os próximos "ele tá pulando etapa". É refatoração pura, sem mudança de comportamento.

### O que entra
- **E1** Criar `src/lib/carga-propria-fsm.ts`:
  ```text
  type Etapa = 'chegou' | 'em_rota' | 'retornou' | 'finalizado';
  type Acao  = 'registrar_chegada' | 'saida_rota' | 'retorno' | 'saida_lacre';
  nextEtapa(atual: Etapa | null, acao: Acao): Etapa
  assertTransicao(de, para): void
  ```
  Substituir as 7 implementações duplicadas por chamadas à FSM.
- **E2** Tipar `etapa_carga_propria` e `etapa_terceirizado` como union literal em `useMovimentacoesPortaria.ts`.
- **E3** Plano de migração: novos registros de Carga Própria sempre com `tipo_movimento='entrada'`. Migração final dos legados em `saida` para `entrada` + ajuste de `etapa`.
- **E4** `useStatusPortariaPorCarga`: estabilizar `idsKey` com `useMemo` baseado em set ordenado.
- **E5** Criar RPC `get_movimento_full(id)` retornando movimento + esperado + related em uma chamada. `MovimentoDetailsDialog` consome via uma única query.
- **E6** `parseDataReferencia`: substituir range hard-coded 40000–60000 por `> 25569 && < (today_serial + 365*5)` e documentar.
- **E7** Atualizar comentários obsoletos em `RegistroMovimentoDialog.tsx`.

### Critérios de aceite
- Buscar `etapa_carga_propria = 'chegou'` no projeto retorna apenas a FSM e os componentes de UI (sem lógica de transição).
- TS pega erro se eu escrever `'em-rota'` (typo) em qualquer lugar.
- `MovimentoDetailsDialog` faz 1 query ao abrir.

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
