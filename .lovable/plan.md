## Problema

No dashboard (print enviado), o bloco "11978 — CEARA ALIMENTOS (SANTA INÊS) · 3 produtos · Pedido 21" agrupa todos os itens do cliente no mesmo dia em um único card. Se o vendedor lançar um **novo pedido** para o mesmo cliente hoje, ele será absorvido nesse mesmo bloco — virando "4 produtos · 2 pedidos" — em vez de aparecer como um pedido independente.

A causa está em `src/components/dashboard/CarregamentoTable.tsx`, função `buildGroups` (linha ~111):

```ts
const key = `${c.data}__${c.codigo_cliente}`;  // <- ignora numero_pedido
```

A chave de agrupamento usa apenas `data + codigo_cliente`, então pedidos distintos do mesmo cliente no mesmo dia colapsam num único card.

Outros lugares já tratam pedidos separadamente:
- `Aprovações` (`src/pages/Aprovacoes.tsx`): chave inclui `numero_pedido` ✅
- `Meus pedidos` (vendedor): chave inclui `numero_pedido` ✅
- `Consolidado`: agrupa por `carga_id` (outra dimensão, ok) ✅

Apenas o dashboard principal está colapsando indevidamente.

## Correção

**Arquivo:** `src/components/dashboard/CarregamentoTable.tsx`

1. Alterar a chave em `buildGroups` para incluir `numero_pedido`:
   ```ts
   const key = `${c.data}__${c.codigo_cliente}__${c.numero_pedido ?? "sn"}`;
   ```
2. Itens sem `numero_pedido` (legado/manual) continuam tratados pelo ramo `singles`, então não há regressão.

## Resultado esperado

- O pedido atual do CEARÁ ALIMENTOS continua como "Pedido 21 · 3 produtos".
- Ao lançar um novo pedido hoje para o mesmo cliente, aparece um **segundo card separado** ("Pedido 22 · N produtos"), permitindo edição, status e exclusão independentes.
- Telas de Aprovações, Meus Pedidos e Consolidado permanecem inalteradas.