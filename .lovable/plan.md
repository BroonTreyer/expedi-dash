
## Auditoria — Aba Portaria

### 🔴 BUGS / CÓDIGO MORTO

**1. `PatioAtualTab.tsx` — código morto pós-refactor**
- L8: `LogIn` importado e nunca usado.
- L70: `liberandoId` (state) declarado e nunca lido (só set).
- L137-149: `handleLiberarEntrada` definido mas nenhum botão chama (foi removido na limpeza anterior). `updateMov` só é usado aqui e no `handleSaidaRapida`.
- L13: `useUpdateMovimentacao` importado e usado em 2 lugares (handleLiberarEntrada morto + handleSaidaRapida vivo).
- **Resultado**: dead code precisa ser removido para evitar confusão futura.

**2. `RegistroMovimentoDialog.tsx` — OCR de lacre incompleto/morto**
- L57-59, L140-142: state `ocrLacreLoading`, `textoLacreLido`, `confiancaLacre` declarados.
- L514-524: UI usa esses valores.
- **Mas nenhum lugar dispara o setOcrLacreLoading/setTextoLacreLido**. Em `handleFotoCapture` (L162-187) só roda OCR para `foto_placa_url`. O fluxo de OCR do lacre está prometido na UI mas nunca é executado. **Resultado**: usuário tira foto do lacre e nunca vê leitura automática — bug funcional silencioso.

**3. `RegistroMovimentoDialog.tsx` — duplo fechamento de ciclo terceirizado**
- L306-309: Ao criar `entrada` de terceirizado pelo dialog, seta `etapa_terceirizado: "aguardando"`.
- Mas `useRegistrarChegadaPortaria` (useVeiculosEsperados.ts L135) já cria entrada com `"no_patio"`.
- L312-318: Após criar `saida` para um prefill terceirizado, atualiza entrada vinculada para `"finalizado"`. ✅ ok.
- **Bug**: estado `"aguardando"` está obsoleto desde a última mudança (todo terceirizado entra como `no_patio`). Os badges em L237-241 e L376-380 ainda mostram "🟡 Aguardando" — código vivo mas que nunca renderiza no fluxo atual. Pode confundir auditoria.

**4. `PortariaKpiCards.tsx` — KPI "Aguardando Entrada" sempre 0**
- L23: `entradas.filter((m) => m.etapa_terceirizado === "aguardando")`.
- Como nenhum fluxo cria mais com `aguardando`, o KPI nunca aparece (está dentro de spread condicional `>0`). **Resultado**: KPI morto / nunca exibido. Remover ou redefinir.

**5. `MovimentoDetailsDialog.tsx` — query roda com prop nula**
- L67-92: `useQuery` configurado mas o componente faz `if (!movimento) return null` em L94 — **antes** dos hooks normalmente seria erro, mas como `useQuery` está antes do return, OK. Porém `dataMovimento`/`placaBusca` viram strings vazias e o `enabled` previne a query. ✅ funcional, mas frágil.

**6. `RegistroPortariaDialog.tsx` — componente órfão**
- Procurado em todo projeto: **nenhum import/uso**. É código morto (substituído por `RegistroMovimentoDialog`). 242 linhas.

**7. `Portaria.tsx` — variável e função não usadas**
- L13: `Plus`, `Truck`, `Download`, `Upload` ainda usados.
- L136-148: `openRegistroFromVeiculoEsperado` permanece, **mas** `VeiculosEsperadosPanel` não é mais o ponto de entrada para walk-ins (agora é `SolicitacoesPendentesPanel`). Função ainda é chamada na aba "Esperados" (planilha importada), portanto viva.
- L57: `today = new Date()` é recriado a cada render — quando `useState` recebe e roda comparação `isToday`, gera nova ref no minuto seguinte. Não é bug crítico, mas trocar por `useMemo`/`useState(() => new Date())`.

### 🟡 BUGS VISUAIS / LAYOUT

**8. `SolicitacoesPendentesPanel.tsx` — badge "NO PÁTIO" enganoso**
- L71-73: walk-in aguardando vínculo recebe badge **"NO PÁTIO"**. Mas conceitualmente o veículo já está no pátio (porteiro registrou entrada). A UI mistura status de pátio com status de autorização. Sugestão: trocar para **"AGUARDANDO LIBERAÇÃO"** (amber) para evitar conflito com badge de Pátio em outras telas.

**9. `PatioAtualTab.tsx` — emojis nos badges de etapa (mobile)**
- L233-234, 238-240: `🟠 Chegou`, `🔵 Em Rota`, `🟡 Retornou`, `🟡 Aguardando`. Já tem `bg-orange-500`, `border-blue-500` etc. — emoji + cor fica redundante e o emoji renderiza com tamanhos diferentes em iOS/Android quebrando alinhamento dos badges. Remover emoji, manter cor.

**10. `PatioAtualTab.tsx` — spinner com emoji ⏳**
- L312, L423: `<span className="animate-spin">⏳</span>`. Emoji + animate-spin não anima bem (spin em emoji renderizado é estranho). Trocar por `<Loader2 className="h-3 w-3 animate-spin" />`.

**11. `PortariaKpiCards.tsx` — grid quebra com 4 cards no mobile**
- L55: `cards.length > 3 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3"`. Como o 4º card "Aguardando" nunca aparece (bug #4), na prática sempre é `grid-cols-3` no mobile com 3 cards apertados. Funcional, mas prever: forçar `grid-cols-2 sm:grid-cols-3` quando 3 cards para melhor legibilidade no mobile estreito (375px).

**12. `Portaria.tsx` — KPI "dateLabel" inconsistente**
- L80: `dateLabel = isToday ? "Hoje" : "no Período"`. PortariaKpiCards renderiza `Entradas no Período` (estranho com minúsculo). Padronizar `"no período"` ou `"Período"`.

**13. `RegistroMovimentoDialog.tsx` — info banner do prefill carga_propria omite dados-chave**
- L417-426: mostra placa/motorista/rota mas **não** mostra peso/qtd_entregas mesmo já existindo no `prefill` para etapas retorno/lacre. Útil para o porteiro conferir.

**14. `VeiculosEsperadosPanel.tsx` — `forwardRef` em badges sem necessidade**
- L34-52: `DataPrevistaBadge`/`DataAtrasadaBadge` envolvidos em `React.forwardRef<HTMLDivElement>`, mas `Badge` (Radix) já encaminha ref. Como nenhum lugar passa ref, `forwardRef` é overkill. Console.log-warning relacionado: erros no log atual sobre "Function components cannot be given refs" em `RupturasPrintDialog`/`CarregamentoTable` indicam que a base de código tem outras instâncias — neste caso, sem necessidade.

### 🟢 SINTAXE / LINT

**15. `PatioAtualTab.tsx` L284**
- Indentação inconsistente: `{!readOnly && (` aberto + filhos com indentação reduzida. JSX válido mas dificulta leitura.

**16. `RegistroMovimentoDialog.tsx` L448**
- `onAutofill={(d) => {` com indentação errada (sai do alinhamento dos demais props do `PlacaInput`).

**17. `Portaria.tsx` L13**
- Import `useCreateMovimentacao` na linha 14 está sendo usado direto na página (em `openRegistroFromVeiculoEsperado` para carga_propria). OK.

**18. Console warnings (do log atual)**
- 3 warnings de `Function components cannot be given refs` apontam para `RupturasPrintDialog` e `CarregamentoTable` — não são da Portaria mas indicam padrão a evitar. Os `forwardRef` desnecessários em VeiculosEsperadosPanel (item #14) seguem o padrão correto, então OK aqui.

## Plano de correção

### Prioridade ALTA (funcionais/dead code)
1. **`PatioAtualTab.tsx`**: remover `LogIn`, `liberandoId`, `handleLiberarEntrada`. Manter `useUpdateMovimentacao` (usado em handleSaidaRapida). Trocar emojis ⏳ por `Loader2`. Remover emojis `🟠🔵🟡🟢` dos badges (manter cor).
2. **`RegistroMovimentoDialog.tsx`**: implementar OCR do lacre em `handleFotoCapture` (chamar `processarOCR(publicUrl, "lacre")` quando `fieldKey === "foto_lacre_url"`) **OU** remover toda a UI e state morto de OCR de lacre. Recomendo implementar (já tem infra).
3. **Remover `RegistroPortariaDialog.tsx`** (arquivo órfão, 242 linhas).
4. **`PortariaKpiCards.tsx`**: remover KPI "Aguardando Entrada" (sempre 0) ou redefinir baseado em `SolicitacoesPendentesPanel` (walk-ins aguardando vínculo).
5. **`PatioAtualTab.tsx` + `RegistroMovimentoDialog.tsx`**: remover lógica de `etapa_terceirizado === "aguardando"` (morta) — manter só `no_patio` e `finalizado`.

### Prioridade MÉDIA (UX)
6. **`SolicitacoesPendentesPanel.tsx`** L71-73: trocar badge "NO PÁTIO" por "AGUARDANDO LIBERAÇÃO" (amber).
7. **`RegistroMovimentoDialog.tsx`** L417-426: incluir peso e qtd_entregas no banner de info do prefill carga_propria.
8. **`PortariaKpiCards.tsx`** L55: ajustar grid responsivo após remoção do KPI morto.
9. **`Portaria.tsx`** L80: padronizar `"no período"` minúsculo consistente.

### Prioridade BAIXA (limpeza)
10. **`VeiculosEsperadosPanel.tsx`** L34-52: remover `React.forwardRef` desnecessário dos badges.
11. **`Portaria.tsx`** L56: usar `useState(() => new Date())` para `today` (memoização correta).
12. Reindentar `PatioAtualTab.tsx` L284-322 e `RegistroMovimentoDialog.tsx` L448-454.

## Arquivos
- ✏️ `src/components/portaria/PatioAtualTab.tsx` — dead code, emojis, spinner
- ✏️ `src/components/portaria/RegistroMovimentoDialog.tsx` — OCR lacre + banner
- ✏️ `src/components/portaria/PortariaKpiCards.tsx` — KPI morto + grid
- ✏️ `src/components/portaria/SolicitacoesPendentesPanel.tsx` — copy badge
- ✏️ `src/components/portaria/VeiculosEsperadosPanel.tsx` — remover forwardRef
- ✏️ `src/pages/Portaria.tsx` — `today` memo + dateLabel
- 🗑️ `src/components/portaria/RegistroPortariaDialog.tsx` — deletar (órfão)

## Sem mudanças
- Schema, RLS, triggers, hooks de Veículos Esperados (já estão consistentes), MovimentoDetailsDialog/EditMovimentoDialog (sem bugs encontrados), CapturaFoto, fluxo Pátio→Saída.
