

## Ruptura no fechamento de carga: peso real ≠ peso planejado

### Problema

Hoje, quando um produto de um pedido é marcado como **Ruptura** (faltou no estoque ou foi cancelado na hora de carregar), o sistema mantém o `peso` original do item no banco. Isso causa três distorções:

1. **Roteirização**: o `pesoTotal` por cliente soma itens em ruptura → carga aparece mais pesada do que realmente é.
2. **Fechamento de Carga**: o `totalPeso` enviado pra `veiculos_esperados.peso` (e exibido no romaneio, no card da portaria, no analytics) inclui o que **não foi carregado**.
3. **Relatórios e KPIs** ("Peso Carregado", performance de vendedor, peso da carga no Consolidado) — todos batem com o planejado, não com o expedido.

Resultado prático: o motorista sai com 12 toneladas, mas o sistema diz que ele saiu com 13,5 t. Diretoria, portaria e faturamento veem números diferentes da realidade física.

### Conceito-chave da solução

Hoje só existe **um peso** por item (`peso`). Vou separar em dois conceitos:

- **Peso planejado** = `peso` (já existe, intocado). É o que o vendedor pediu.
- **Peso efetivo** = `peso` se `ruptura = false`; **0** se `ruptura = true`. É o que realmente vai no caminhão.

Toda agregação que representa **carga física** (roteirização, fechamento, romaneio, KPI "Peso Carregado", peso enviado pra portaria, analytics de expedição) passa a usar **peso efetivo**.

Toda agregação que representa **demanda comercial** (KPI "Peso Total" do dashboard de vendas, relatórios de pedidos, performance do vendedor por volume vendido) continua usando **peso planejado**.

Sem mudança de schema. Sem migration. É decisão de qual `reduce` usar em cada local.

### Mudanças concretas

**1. Helper central** — `src/lib/peso-utils.ts` (novo)
```ts
export const pesoEfetivo = (c: { peso: number | null; ruptura: boolean }) =>
  c.ruptura ? 0 : (c.peso ?? 0);
export const somaPesoEfetivo = (arr) => arr.reduce((s, c) => s + pesoEfetivo(c), 0);
export const somaPesoPlanejado = (arr) => arr.reduce((s, c) => s + (c.peso ?? 0), 0);
```

**2. Roteirização (`RoteirizacaoDialog.tsx`)**
- Ao agrupar por cliente, calcular `pesoTotal` com **peso efetivo**.
- Itens em ruptura aparecem no card do cliente com badge "Ruptura — não embarcado" e peso riscado (visual de transparência), mas **não somam** no total da carga nem no envio pra rota.
- Distância/rota não muda — cliente com 100% de ruptura permanece na rota só se sobrar algum item; se zerou tudo, é avisado e excluído da rota.

**3. Fechamento de Carga (`FechamentoLoteDialog.tsx`)**
- `totalPeso` e `g.pesoTotal` usam **peso efetivo**.
- O `meta.totalPeso` enviado pro `onSubmit` (que vai pra `veiculos_esperados.peso`) reflete o peso real.
- Resumo no topo mostra: `12.450 kg embarcados` + se houver rupturas, linha extra discreta `↳ 850 kg em ruptura (não embarcado)`.

**4. Romaneio impresso (`CargaPrintDialog.tsx`)**
- Peso total da carga = peso efetivo.
- Itens em ruptura aparecem riscados na lista de produtos do cliente, marcados "RUPTURA — NÃO CARREGADO". Motorista assina sabendo o que falta. Sem isso, ele recebe um romaneio que não bate com a nota.

**5. Consolidado (`Consolidado.tsx` / `ConsolidadoPrintDialog.tsx`)**
- Coluna "Peso" e "Peso Total" usam peso efetivo.
- Coluna nova opcional "Pl./Ef." mostrando `13.300 / 12.450` quando houver divergência (só aparece se a carga teve ruptura).

**6. Dashboard KPIs (`KpiCards.tsx`)**
- "Peso Total" = continua planejado (é métrica comercial — quanto foi pedido).
- "Peso Carregado" = peso efetivo dos status `Carregado` (já filtra status, só passa a desconsiderar ruptura também). Hoje, se um item está marcado Carregado **e** Ruptura ao mesmo tempo (caso possível), ele ainda soma — vou consertar.
- Tooltip do "Peso Total" ganha nota: "Soma do peso pedido. Para peso embarcado, veja 'Peso Carregado'."

**7. Analytics (`useAnalytics.ts`)**
- `totalPeso` (visão geral) = continua planejado.
- `totalCarregado` = peso efetivo de quem está em status Carregado (mudança mínima).
- Aba Expedição: gráficos de "kg expedidos por dia/vendedor/transportadora" passam a usar peso efetivo. Rupturas continuam contando na aba Rupturas com sua métrica própria.

**8. Portaria — peso esperado vs. peso real**
- O campo `veiculos_esperados.peso` passa a receber o peso efetivo (resolve o problema-raiz do print que a diretoria vê).
- Sem mudar fluxo da portaria.

### O que NÃO muda

- Nenhuma coluna nova no banco. O "peso efetivo" é calculado em runtime.
- Vendedor continua marcando ruptura do mesmo jeito.
- O peso original do item permanece intocado — é dado histórico (quanto foi pedido). Se a ruptura for desmarcada depois (produto chegou), o peso volta a contar automaticamente.
- Rupturas continuam aparecendo em todos os lugares atuais (página Rupturas, badges, etc).

### Pergunta única antes de implementar

Quando uma carga é fechada com 1 item em ruptura, o que você quer que aconteça com aquele item específico no banco?

**Opção A** *(recomendada)*: o item permanece na carga (`carga_id` setado, `etapa = logistica`), mas com `ruptura = true`. Aparece no romaneio riscado, mas conta como histórico. Vantagem: rastreabilidade — você sabe que aquele cliente teve ruptura naquela carga.

**Opção B**: o item em ruptura é "soltado" da carga no momento do fechamento (`carga_id = null`, volta pra etapa `vendas`), pra ser refaturado depois. Vantagem: a carga só carrega o que foi efetivamente embarcado. Desvantagem: perde o vínculo histórico e mistura com pedidos novos.

Confirma A ou prefere B?

