## Diagnóstico: o sistema está contando diferente em cada lugar

Sim, há uma **inconsistência real** entre o KPI "Rupturas" do painel principal e a aba "Rupturas". Os dois contam coisas diferentes — por isso parece que tem "mais ruptura" em um lugar do que no outro.

### O que cada tela conta hoje

**Painel principal (`KpiCards.tsx`)** — conta **pedidos únicos** afetados:
```
pedidosComRuptura  = pedidos distintos com ruptura total
pedidosComParcial  = pedidos distintos com ruptura parcial
Rupturas           = soma dos dois (deduplicado por numero_pedido)
```

**Aba Rupturas (`Rupturas.tsx`)** — conta **linhas de produto** em ruptura:
```
itens = rupturas.length   // cada item de cada pedido entra separado
```

Exemplo: um pedido com 5 produtos e 3 deles em ruptura aparece como **1** no painel e **3** na aba. Por isso a aba "infla" os números.

### Há ainda um detalhe sutil

O painel usa `c.ruptura` direto + `isRupturaParcial`, mas em outras partes do app já existe `temRuptura()` que considera `ruptura_sinalizada` (flag do trigger do banco). A aba também não usa `temRuptura`. Em casos antigos onde o trigger marcou a sinalização mas o item não tem peso reduzido visível, pode haver pequena diferença adicional.

## Proposta de correção

Padronizar para que os dois lugares falem a mesma língua, mostrando ambas as visões sem ambiguidade.

### 1. Aba Rupturas — adicionar contador de pedidos únicos
No KPI "Itens em ruptura", além das linhas de produto, mostrar também a quantidade de **pedidos únicos** afetados. Assim:
- "Itens em ruptura: **23**" (linhas de produto)
- "em **8 pedidos** · **5 produtos distintos**" (subtítulo)

Isso bate diretamente com o número do painel principal.

### 2. Painel principal — clarificar o tooltip
Ajustar o tooltip do card "Rupturas" para deixar explícito que conta **pedidos**, não itens, e indicar quantos itens de produto isso representa. Exemplo:
> "8 pedido(s) afetado(s) — 23 item(ns) de produto em ruptura. 1.240 kg perdidos."

### 3. Unificar a regra de detecção
Trocar as checagens manuais `c.ruptura || isRupturaParcial(c)` pela função única `temRuptura(c)` (que já existe em `src/lib/ruptura-utils.ts`) em:
- `src/pages/Rupturas.tsx` (filtro `todasRupturas`)
- `src/components/dashboard/KpiCards.tsx` (cálculo de `pedidosComRuptura` / `pedidosComParcial`)

Resultado: ambas as telas usam o mesmo critério (`ruptura` OR `ruptura_sinalizada` OR peso reduzido), eliminando qualquer divergência por causa do trigger do banco.

## Arquivos afetados
- `src/pages/Rupturas.tsx` — KPI "Itens em ruptura" passa a mostrar pedidos únicos + produtos distintos.
- `src/components/dashboard/KpiCards.tsx` — tooltip clarificado e uso de `temRuptura`.
- (Opcional) `src/lib/ruptura-utils.ts` — sem mudanças; apenas passa a ser a fonte única.

## Resultado esperado
Painel mostra **8 rupturas** (pedidos), aba mostra **23 itens / 8 pedidos**. Os números batem e ninguém mais fica em dúvida sobre qual é o "correto" — os dois são, em granularidades diferentes.
