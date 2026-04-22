
## Corrigir Analytics — todos os bugs e inconsistências reais

### Bugs e conflitos identificados (objetivos, no código)

**1. KPI "Total Pedidos" mostra número inflado (errado)**
Em `useAnalytics.ts` linha 300: `totalPedidos = filtered.length` — conta **linhas de produto**, não pedidos. Carga com 5 itens = 5 "pedidos". A "Taxa de Ruptura" usa `totalPedidosUnicos` (correto), mas o KPI ao lado mostra outro número. **Dois números diferentes para a mesma coisa na mesma tela.**

**2. KPI "Peso Total" inclui pedidos cancelados/problema**
Não filtra por `status`. Linhas com status `Pendente / Problema` (visíveis nos logs de rede) são somadas no peso total. Diretoria vê peso "expedido" que nunca saiu.

**3. Comparativo com período anterior está errado**
Linha 105: `prevFrom = subDays(dateFrom, daysDiff + 1)` — em "30 dias" calcula 31 dias para trás. Off-by-one. Período "1–30/abr" compara com "30/mar–31/mar" (2 dias) em vez de "1–30/mar". **Toda variação % está errada.**

**4. Comparativo do período anterior também não filtra por vendedor/UF/tipo**
Linha 122: query `previous` traz só `data, peso, status, ruptura, numero_pedido` — sem vendedor/uf/tipo. Quando você aplica filtro "vendedor X", o período atual é filtrado mas o anterior é o total da empresa. **Variação compara coisas diferentes.**

**5. Filtros não funcionam para nada que use dados do período anterior**
Mesmo problema do #4: as variações dos KPIs ignoram filtros.

**6. "Média Diária" divide por dias com lançamento, não dias do período**
Linha 305: `mediaDiaria = totalPeso / diasUnicos`. Se lançou em 10 dias dos 30, divide por 10. Diretoria interpreta como "média dos 30 dias". Inflado.

**7. "Média Semanal" de rupturas não é semanal**
Linha 314: divide total de rupturas por `Math.ceil(dailyComRuptura.length / 7)` — usa apenas dias com lançamento, não semanas reais do período.

**8. "Pior Dia" considera dias com 1 pedido só**
1 ruptura em 1 pedido = 100% — vence sempre dias com volume real e taxa pior. Precisa exigir mínimo de pedidos (ex: ≥10) para entrar no ranking.

**9. "Total Sinalizadas" inclui resolvidas mas KPI está em laranja sem distinção**
Confunde — número grande mas pode ser tudo já resolvido. Faltam dois números separados (sinalizadas atualmente abertas vs total histórico).

**10. Limite de 5000 linhas silencioso**
Linhas 119 e 125: `.limit(5000)`. Em 30 dias com volume real, **estoura sem aviso** e os números ficam incompletos. Sem indicação na UI.

**11. Erros de console (React refs)**
Console mostra warning em `KpiCard` e `StatusMiniCards` por uso de ref em function component. Não quebra mas polui logs.

**12. Heatmap não é renderizado em lugar nenhum**
`heatmap` é calculado em `useAnalytics.ts` (linhas 285–296) mas a página nunca consome. Código morto.

**13. CSV exportado usa `;` mas Excel BR pode interpretar errado dependendo do locale**
Linha 111 do Analytics.tsx — funciona, mas valores numéricos com vírgula brasileira não são tratados; números grandes vão como `12345` sem formatação. OK manter `;` mas adicionar BOM (já tem) e formatar números.

**14. Distribuição por UF agrupa "N/I" junto com UFs reais**
Mistura linhas sem UF no ranking — uma "UF" inexistente pode aparecer no top, distorcendo participação. Deve ser separada (ou excluída do total para % de participação).

**15. Ranking de Vendedores: "pedidos" também é linha de produto, não pedido**
Linha 181: `entry.pedidos += 1` por linha. Mesmo erro do #1.

**16. "Participação %" do vendedor usa peso total **incluindo** linhas sem vendedor ("Sem vendedor")**
Linha 188: divisor é `totalPesoAll` que inclui linhas sem `vendedor_id`. Vendedor com 100% real do faturado mostra 80% porque tem 20% "sem vendedor" no denominador.

---

### Plano de correção (1 entrega, sem fases)

Tudo é bug fix em **2 arquivos**: `src/hooks/useAnalytics.ts` e `src/pages/Analytics.tsx`.

**Em `useAnalytics.ts`:**

1. **Corrigir off-by-one do período anterior** — usar `subDays(dateFrom, daysDiff + 1)` → `subDays(dateFrom, daysDiff)` e `subDays(dateFrom, 1)` para `prevTo`.
2. **Período anterior puxa as mesmas colunas** (vendedor, uf, tipo) e aplica os mesmos filtros antes de calcular comparativos.
3. **Total Pedidos** passa a usar `totalPedidosUnicos` em todos os KPIs e rankings (contagem por `numero_pedido` distinto, fallback para linha quando `numero_pedido` é null).
4. **Peso Total / Carregado** filtram status válidos (excluir `Pendente / Problema` e cancelados — adicionar lista explícita de status que somam).
5. **Média Diária** divide por **dias do período** (`differenceInDays + 1`), não por dias com lançamento. Adicionar segundo número opcional "média por dia útil ativo" se necessário.
6. **Média Semanal de rupturas** divide por semanas do período real (`periodDays / 7`).
7. **Pior Dia** filtra dias com pelo menos N pedidos (configurável, default 10). Se nenhum atende, mostra "—" com texto explicativo.
8. **Sinalizadas vs Resolvidas** — separar os dois números no card.
9. **Detectar truncamento**: se `data.length === 5000`, retornar flag `truncated: true` e mostrar aviso visual. Aumentar limite para 20000 ou paginar (em 30d tipicamente cabe).
10. **Limpar `heatmap`** se não for usar, ou implementar a visualização (recomendo remover já que tem o gráfico de taxa diária — duplicaria).
11. **Vendedor `participacao`** divide pelo total **com vendedor identificado** (excluir "Sem vendedor" do denominador, mantê-lo na lista marcado).
12. **UF "N/I"** removida do top 10 e mostrada separada no rodapé como "Sem UF: X kg".
13. **Vendedor `pedidos`** usa Set de `numero_pedido`.

**Em `Analytics.tsx`:**

14. Corrigir warnings React (envolver `KpiCard`, `StatusMiniCards`, `VarBadge` em `forwardRef` ou remover ref implícito do parent).
15. Banner de aviso quando `analytics.truncated === true`: "Resultado limitado a 5000 registros — refine o período".
16. KPI "Total Pedidos" passa a mostrar o subtítulo "(pedidos únicos)" para deixar claro.
17. KPI "Média Diária" subtítulo: "média sobre {N} dias do período".
18. Card "Total Sinalizadas" vira dois mini-cards: "Abertas agora" + "Resolvidas no período".
19. Tooltip do "Pior Dia" mostra também `X rupturas em Y pedidos`.
20. Remover código morto do `heatmap` (ou implementar — a definir; recomendação: **remover**, já existe gráfico de taxa diária).
21. CSV exportado formata números com `toLocaleString("pt-BR")` para abrir bonito no Excel BR.

---

### Resultado esperado

- Todos os números da página passam a bater entre si (Total Pedidos = base do Taxa de Ruptura, etc).
- Variação % vs período anterior fica matematicamente correta.
- Filtros afetam **tudo**, inclusive comparativos.
- Peso/pedidos cancelados não inflam mais os KPIs.
- Aviso visível quando dados são truncados (não some silenciosamente).
- Sem warnings no console.
- Sem código morto.

### Arquivos
- ✏️ `src/hooks/useAnalytics.ts` — correções 1–13.
- ✏️ `src/pages/Analytics.tsx` — correções 14–21.

### Pergunta única antes de implementar
Há **um ponto de decisão** que preciso confirmar:

> Quando o usuário lança um pedido com status **"Pendente / Problema"**, ele deve aparecer no **Peso Total** do Analytics ou não?
> - **Não (recomendado)**: Peso Total = só status válidos (`Aguardando`, `Pronto`, `Carregando`, `Carregado`). É o que a diretoria entende como "expedição".
> - **Sim**: mantém como está hoje (soma tudo) — mas aí precisa renomear o KPI para "Peso Lançado".

Responda **"não"** (mais comum) ou **"sim"** e eu implemento tudo de uma vez.
