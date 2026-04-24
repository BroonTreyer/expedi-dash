

## Ajustes nos KPIs do Consolidado

### Diagnóstico

Olhando o print enviado (e o código atual em `src/pages/Consolidado.tsx`), a faixa de KPIs tem **6 cards**: Veículos · Peso Total · **Pedidos** · No Pátio · Carregando · Expedidos. Dois problemas:

1. **"Pedidos" está sobrando** — o usuário quer remover esse bloco.
2. **"Carregando" hoje só conta a etapa `carregando` da Portaria** (linha 484: `if (etapa === "carregando") c.carregando += 1;`). Como o status logístico real "Carregando" do pedido (campo `carregamentos_dia.status`) não é considerado, o KPI fica zerado mesmo quando há cargas com itens em status "Carregando" no painel — bate com o print (mostra `0`).

### Mudança 1 — remover KPI "Pedidos"

Em `src/pages/Consolidado.tsx`:

a) **Array `kpis`** (linha 538-545): remover a linha `{ label: "Pedidos", value: totalPedidos, ... }`. Restam **5 cards**: Veículos · Peso Total · No Pátio · Carregando · Expedidos.

b) **Variável `totalPedidos`** (linha 476): manter, pois ainda é usada no `printData` (linha 519) e no romaneio (linha 412). Sem mudança.

c) **Layout do grid de KPIs**: hoje deve estar com `grid-cols-3 sm:grid-cols-6` (ou similar). Ajustar para `grid-cols-2 sm:grid-cols-3 lg:grid-cols-5` para distribuir bem 5 cards (mobile 2 colunas em 3 linhas → desktop 5 lado a lado). Vou conferir o wrapper exato e ajustar o número de colunas para não deixar buraco.

### Mudança 2 — recalcular "Carregando" considerando status logístico + portaria

A intenção do KPI é responder: **"quantas cargas estão sendo carregadas agora?"**. Hoje só olha portaria; o correto é considerar **qualquer um** dos dois sinais:

- **Sinal Portaria**: `etapa === "carregando"` (terceirizado liberado para carregamento).
- **Sinal Logístico**: a carga tem **pelo menos um item** com `status === "Carregando"` na tabela `carregamentos_dia`.

Atualizar o `useMemo` de `portariaCounts` (linhas 479-488):

```ts
const portariaCounts = useMemo(() => {
  const c = { patio: 0, carregando: 0, expedido: 0 };
  for (const g of groups) {
    const etapa = statusPortariaMap?.get(g.cargaId)?.etapa ?? "aguardando";
    const temItemCarregando = g.items.some((it) => it.status === "Carregando");
    const isCarregando = etapa === "carregando" || temItemCarregando;

    if (etapa === "patio" || etapa === "carregando") c.patio += 1;
    if (isCarregando) c.carregando += 1;
    if (etapa === "expedido") c.expedido += 1;
  }
  return c;
}, [groups, statusPortariaMap]);
```

> Observação: uma carga "Carregando" pelo status logístico provavelmente também está em pátio. Mantenho `c.patio` como está (só conta etapa de portaria de fato) para não inflar duplamente — ou seja, "No Pátio" continua sendo um indicador físico (veículo bateu na portaria), e "Carregando" passa a ser indicador operacional (alguém está embarcando o pedido, vindo da logística ou da portaria).

### Mudança 3 — manter sincronia com a coluna/badge da tabela?

A coluna **"Portaria"** da tabela continua mostrando apenas `PortariaStatusBadge` derivado do hook `useStatusPortariaPorCarga` (estrito da portaria). **Não vou mudar** — a coluna é "status na portaria" e o KPI passa a ser "está sendo carregada (operacionalmente)". Os dois conceitos podem divergir no início do embarque (logística marca "Carregando" antes da portaria liberar), e está correto assim.

### Validação (cenários)

1. Print atual mostra "Pedidos: 102" e "Carregando: 0" → após mudança, card "Pedidos" some, e se houver itens com `status='Carregando'` o card "Carregando" passa a refletir essa contagem em tempo real.
2. Carga sem nenhum item em "Carregando" e sem etapa portaria `carregando` → KPI segue 0. ✅
3. Carga com 1+ item `status='Carregando'` mas portaria ainda em `patio` → KPI "Carregando" incrementa. ✅
4. Carga com etapa portaria `carregando` e nenhum item logístico em "Carregando" → KPI "Carregando" incrementa (mantém comportamento atual). ✅
5. Mobile: grid passa de 6 para 5 cards distribuídos em 2 colunas (3 linhas) sem buraco visual.
6. `printData`/romaneio continuam exibindo "Pedidos" no relatório impresso (não é o card de KPI da tela, é coluna do PDF) — preservado.

### Fora do escopo

- Não mexo na coluna "Portaria" da tabela nem no `PortariaStatusBadge`.
- Não mexo no filtro "Etapa Portaria".
- Não mexo no romaneio impresso (continua mostrando "Pedidos" como coluna).
- Não mexo no painel principal (`/`) nem no Kanban.

### Resultado

A faixa de KPIs do Consolidado fica mais enxuta (5 cards) e o card **"Carregando"** passa a refletir a realidade operacional: conta tanto cargas que a portaria já liberou para embarque quanto cargas cujos itens já estão marcados como "Carregando" pela logística — atualizando em tempo real conforme o status muda.

