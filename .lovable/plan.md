

## Tornar visível o "corte parcial" feito no fechamento de carga

### Problema

Quando você reduz o peso de um item ao fechar a carga (ex.: pedido original 500 kg → carregado 300 kg), o sistema:
- Salva corretamente: `peso = 300`, `peso_manual = true`, `peso_original = 500` (preservado pelo trigger), `ruptura_sinalizada = true`.
- **NÃO marca `ruptura = true`** (é parcial, não total).
- A diferença de 200 kg fica registrada, mas só aparece em **3 lugares**:
  1. Página **Rupturas** (mas só se o filtro de data incluir o dia da carga; default é "hoje").
  2. Analytics → aba **Rupturas**.
  3. Romaneio de **Rupturas** impresso.

Por isso parece que "sumiu": o Dashboard, o Consolidado e o romaneio da carga (CargaPrintDialog) **não mostram nenhuma marca** de que houve corte parcial. O peso "carregado" mostra 300 kg, mas não diz que foram 200 kg perdidos.

### Mudanças

#### 1. Dashboard principal — `src/components/dashboard/CarregamentoTable.tsx`

Adicionar badge **"Parcial"** (âmbar, mesmo estilo do EditarCargaDialog) ao lado do nome do produto quando `isRupturaParcial(item)` for true, com tooltip mostrando "Original: 500 kg → Carregado: 300 kg (−200 kg)". Já existe o ícone vermelho de ruptura total; o âmbar fica ao lado para parcial.

#### 2. KPIs do Dashboard — `src/components/dashboard/KpiCards.tsx`

No card "Rupturas" (ou criar sublinha), mostrar contagem combinada: "X totais + Y parciais" e o **peso não carregado total** do dia. Hoje só conta `c.ruptura === true`, então parciais ficam invisíveis.

#### 3. Consolidado — `src/pages/Consolidado.tsx`

Em cada card de carga fechada, exibir 1 linha extra abaixo do peso total quando houver pelo menos um item com ruptura parcial:
> "↳ 200 kg cortados em 1 item ao fechar (ruptura parcial)"

Cor âmbar, mesma do EditarCargaDialog.

#### 4. Romaneio impresso da carga — `src/components/dashboard/CargaPrintDialog.tsx`

Para cada item com corte parcial, mostrar abaixo do peso: "Pedido original: 500 kg • Cortado: 200 kg" em fonte pequena âmbar. No total da carga, adicionar linha "Peso planejado / Peso embarcado / Cortado".

#### 5. Rupturas — `src/pages/Rupturas.tsx`

- Trocar default do filtro de data de "hoje" para **últimos 7 dias** (a queixa típica é "fechei ontem e hoje não acho"). Assim cortes recentes ficam visíveis sem precisar mexer no filtro.
- Adicionar selo no topo: "Mostrando rupturas totais e parciais entre [data] e [data]" para deixar claro que parciais estão incluídas.

### Onde os dados JÁ estão (não muda)

- DB: `carregamentos_dia.peso` (reduzido), `peso_original` (preservado), `peso_manual = true`, `ruptura_sinalizada = true`.
- Hook `useAnalytics` e função `pesoNaoCarregado` já calculam corretamente.
- RupturasPrintDialog já marca "Parcial" com a diferença.

### Arquivos afetados

- `src/components/dashboard/CarregamentoTable.tsx` — badge "Parcial" + tooltip.
- `src/components/dashboard/KpiCards.tsx` — KPI Rupturas inclui parciais + peso cortado.
- `src/pages/Consolidado.tsx` — linha "kg cortados" no card da carga.
- `src/components/dashboard/CargaPrintDialog.tsx` — destaque do corte por item + total embarcado vs planejado.
- `src/pages/Rupturas.tsx` — default 7 dias + label do escopo.

### Resultado

Após cortar parte de um pedido ao fechar a carga, o usuário **vê imediatamente**:
- Na **tabela do Dashboard**: badge âmbar "Parcial" no item.
- Nos **KPIs**: "X totais + Y parciais — 200 kg perdidos hoje".
- No **Consolidado**: alerta âmbar no card da carga afetada.
- No **romaneio impresso**: o corte fica documentado por item e no total.
- Na página **Rupturas**: aparece por padrão (últimos 7 dias) sem precisar mexer no filtro.

