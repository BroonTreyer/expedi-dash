
## KPIs "Carregando" e "Expedidos" com Peso + Quantidade de carros

### Diagnóstico

Hoje os cards "Carregando" e "Expedidos" em `/consolidado` mostram apenas a **contagem de carros** (linhas 543-544 de `src/pages/Consolidado.tsx`). O usuário quer ver também o **peso total (kg)** dessas cargas. Como peso é a métrica operacional mais relevante para expedição, vou colocá-lo em **destaque (valor principal)** e a quantidade de carros como **subtítulo** logo abaixo — mesmo padrão visual do `KpiCards.tsx` do dashboard (campo `sub`).

### Mudança 1 — agregar peso em `portariaCounts`

`src/pages/Consolidado.tsx`, `useMemo` linha 479-489:

```ts
const portariaCounts = useMemo(() => {
  const c = { patio: 0, carregando: 0, expedido: 0, pesoCarregando: 0, pesoExpedido: 0 };
  for (const g of groups) {
    const etapa = statusPortariaMap?.get(g.cargaId)?.etapa ?? "aguardando";
    const temItemCarregando = g.items.some((it) => it.status === "Carregando");
    if (etapa === "patio" || etapa === "carregando") c.patio += 1;
    if (etapa === "carregando" || temItemCarregando) {
      c.carregando += 1;
      c.pesoCarregando += g.pesoTotal;
    }
    if (etapa === "expedido") {
      c.expedido += 1;
      c.pesoExpedido += g.pesoTotal;
    }
  }
  return c;
}, [groups, statusPortariaMap]);
```

> Uso `g.pesoTotal` (peso efetivo já calculado no agrupamento, consistente com o KPI "Peso Total").

### Mudança 2 — array `kpis` com campo `sub`

Linha 539-545. Adicionar `sub` opcional nos dois cards:

```ts
const kpis: Array<{ label: string; value: string | number; sub?: string; icon: any; color: string }> = [
  { label: "Veículos", value: totalVeiculos, icon: Truck, color: "text-primary" },
  { label: "Peso Total", value: `${pesoTotal.toLocaleString("pt-BR")} kg`, icon: Weight, color: "text-foreground" },
  { label: "No pátio", value: portariaCounts.patio, icon: ParkingCircle, color: "text-blue-600 dark:text-blue-400" },
  {
    label: "Carregando",
    value: `${portariaCounts.pesoCarregando.toLocaleString("pt-BR")} kg`,
    sub: `${portariaCounts.carregando} ${portariaCounts.carregando === 1 ? "carro" : "carros"}`,
    icon: Package,
    color: "text-amber-600 dark:text-amber-400",
  },
  {
    label: "Expedidos",
    value: `${portariaCounts.pesoExpedido.toLocaleString("pt-BR")} kg`,
    sub: `${portariaCounts.expedido} ${portariaCounts.expedido === 1 ? "carro" : "carros"}`,
    icon: CheckCircle2,
    color: "text-emerald-600 dark:text-emerald-400",
  },
];
```

### Mudança 3 — renderizar `sub` no card

Linha 633-641, dentro do `CardContent`, adicionar o subtítulo logo após o valor principal (mesmo padrão do `KpiCards.tsx`):

```tsx
<span className="text-sm sm:text-xl font-bold tracking-tight truncate">{k.value}</span>
{k.sub && (
  <span className="text-[10px] sm:text-xs text-muted-foreground font-medium truncate -mt-0.5">{k.sub}</span>
)}
```

### Validação

1. Carga única em `status='Carregando'` com 12.500 kg → card "Carregando" mostra **`12.500 kg`** em destaque + **`1 carro`** abaixo.
2. 3 cargas expedidas somando 38.200 kg → card "Expedidos" mostra **`38.200 kg`** + **`3 carros`**.
3. Sem cargas em uma etapa → mostra **`0 kg`** + **`0 carros`**.
4. Mobile (grid 2 colunas) → o `sub` quebra de linha naturalmente, sem overflow (mesmo `truncate` do `KpiCards.tsx`).
5. Demais cards (Veículos, Peso Total, No pátio) ficam sem `sub`, layout intacto.

### Fora do escopo

- Não mexo nos outros 3 cards.
- Não mexo na coluna "Portaria" da tabela nem na lógica de etapa.
- Não mexo no romaneio impresso.

### Resultado

Os cards "Carregando" e "Expedidos" passam a comunicar **peso operacional em destaque** (métrica principal de expedição) com a contagem de veículos como contexto secundário, mantendo o visual consistente com os KPIs do painel principal.
