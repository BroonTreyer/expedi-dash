

# Auditoria Completa — Todos os Bugs Encontrados

## CRÍTICO 1: O campo `trips_index` do OSRM NÃO é a posição na rota — ele indica QUAL TRIP o waypoint pertence

**Arquivo: `supabase/functions/roteirizar/index.ts` linha 227**

Os logs revelam o problema real:
```
OSRM trip sorted waypoints: [{"wi":0,"ti":0},{"wi":1,"ti":0},{"wi":2,"ti":0},{"wi":3,"ti":0},{"wi":4,"ti":0}]
```

Todos os `trips_index = 0` porque OSRM usa `trips_index` para dizer "este waypoint pertence ao trip nº 0" (sempre 0 quando há um único trip). **Não é a ordem de visita.** A ordem correta de visita está em `waypoint_index` do array `trips[0].legs`, ou simplesmente na posição sequencial do array `waypoints` JÁ retornado pelo OSRM (o OSRM retorna `waypoints` em ordem de input, e cada waypoint tem `trips_index` = qual trip + o índice no trip via `waypoint_index`).

A ordenação otimizada do OSRM `/trip` fica nos `legs` do trip. A ordem correta dos destinos é dada por `legs[0].summary`, `legs[1].summary`, etc. Mas o mapeamento mais simples é: o OSRM retorna `waypoints` onde cada um tem `waypoint_index` = índice no trip. Para obter a ordem de visita, ordena-se `waypoints` por `waypoint_index` (não `trips_index`).

**Fix correto:** Ordenar por `a.waypoint_index - b.waypoint_index`.

---

## CRÍTICO 2: O `trechos[0]` = "Goiânia → Dest1" mas o `activeTrechoMap` usa `i + 1` — o último destino nunca recebe trecho

**Arquivo: `RoteirizacaoDialog.tsx` linhas 317-329**

```typescript
activeGroups.filter(g => g.cidade && g.uf).forEach((g, i) => {
  const legIdx = i + 1; // i=0 → trechos[1] (leg FROM dest1 to dest2)
  if (trechos[legIdx]) map.set(groupKey(g), trechos[legIdx]);
});
```

O `trechos` retornado pela edge function agora tem exatamente 4 trechos para 4 destinos (Goiânia→D1, D1→D2, D2→D3, D3→D4). Para 4 destinos com `i = 0,1,2,3`, `legIdx = 1,2,3,4`. O índice 4 não existe (só há 4 trechos, índices 0-3). O último destino nunca recebe trecho.

Mas também: o trecho correto para mostrar **no card do destino** deveria ser o trecho de **chegada** nele (Goiânia→Dest1 aparece no card de Dest1, D1→D2 aparece no card de D2, etc.). Então o índice correto é `i` (não `i + 1`):
- Dest1 (i=0) → `trechos[0]` = "Goiânia → Dest1" ✓
- Dest2 (i=1) → `trechos[1]` = "Dest1 → Dest2" ✓

**Fix:** Usar `legIdx = i` ao invés de `i + 1`.

---

## CRÍTICO 3: O texto do trecho no card diz "↳ X km · ~Y min até próximo" mas mostra o trecho de CHEGADA, não de saída

**Arquivo: `RoteirizacaoDialog.tsx` linha 120**

O label diz "até próximo" mas com o fix acima mostrará o trecho de chegada (do anterior até aqui), não o de saída (daqui até o próximo). O texto deve ser "↳ X km · ~Y min desde anterior" ou a semântica deve ser corrigida: mostrar o trecho de saída (de i para i+1).

**Decisão:** Mostrar o trecho de saída (daqui para o próximo) com label "até próximo". Isso significa usar `legIdx = i + 1` mas trecho[i+1] = D(i)→D(i+1), e o card do último destino não mostra trecho (correto, não há próximo). O problema é que `trechos[0]` = Goiânia→D1, então `i=0` com `legIdx=1` mostra `trechos[1]` = D1→D2 ✓, `i=1` mostra `trechos[2]` = D2→D3 ✓, `i=2` (último, n=3) mostra `trechos[3]` = D3→D4 ✓, `i=3` (n=4) mostra `trechos[4]` = undefined (sem próximo ✓).

**Portanto o `i + 1` estava correto para "até próximo", mas o bug era que o edge function anterior só gerava 3 trechos entre destinos (excluindo Goiânia→D1). Com o fix do OSRM os trechos agora incluem Goiânia→D1 como `trechos[0]`, então o `i+1` funciona corretamente para mostrar "próximo".**

**A questão é que falta mostrar o trecho de chegada (Goiânia→Dest1) no primeiro card.** Solução: adicionar uma linha separada no primeiro card mostrando a distância de Goiânia.

---

## CRÍTICO 4: `geocodeCache` é módulo-level no RotaMap — persiste entre sessões e pode ter dados desatualizados

**Arquivo: `RotaMap.tsx` linha 33**

```typescript
const geocodeCache = new Map<string, Coords | null>();
```

Esta cache é criada uma vez e nunca é limpa. Se Nominatim retornar coordenadas erradas para uma cidade (ex: "Anápolis, GO" geocodificando para outro estado), o erro fica cacheado para sempre durante a sessão. Não há mecanismo de retry ou timeout.

**Fix:** Adicionar TTL simples ou pelo menos não cachear resultados `null` (falhas) para permitir retry.

---

## MÉDIO 5: `setGroups` dentro de `handleRoteirizar` busca por `cidade+uf` — se dois clientes diferentes têm a mesma cidade, o segundo é silenciosamente ignorado

**Arquivo: `RoteirizacaoDialog.tsx` linhas 265-278**

```typescript
const found = prev.find(
  (g) =>
    g.cidade?.toLowerCase() === opt.cidade?.toLowerCase() &&
    g.uf?.toLowerCase() === opt.uf?.toLowerCase()
);
if (found && !newOrder.includes(found)) newOrder.push(found);
```

Se dois grupos têm a mesma `cidade+uf` (clientes diferentes mas na mesma cidade), `prev.find` retorna apenas o primeiro. O segundo grupo nunca entra em `newOrder` e só aparece no "Append any groups not matched" no final — sempre colocado no fim, nunca otimizado.

**Fix:** O `ordemOtimizada` da edge function agora retorna `originalIndex`. Usar `originalIndex` para mapear de volta aos grupos em vez de `cidade+uf`.

---

## MÉDIO 6: Quando `open` muda de `false` para `true` mas `items` não mudou, o `useEffect` não dispara — groups ficam da sessão anterior

**Arquivo: `RoteirizacaoDialog.tsx` linha 144**

```typescript
useEffect(() => {
  if (open && items.length > 0) { ... }
}, [open, items]);
```

Se o usuário abre o dialog, fecha sem avançar, muda a seleção de pedidos e reabre, o `items` é uma nova referência de array (porque `selectedItems` é recalculado com `useMemo`). O `useEffect` dispara corretamente. **Este bug NÃO existe atualmente.**

---

## MÉDIO 7: `SortableDestinationCard` usa `group.codigoCliente ?? "__sem__"` como ID do sortable — se há dois grupos sem `codigo_cliente`, IDs colidem

**Arquivo: `RoteirizacaoDialog.tsx` linha 73**

```typescript
id: group.codigoCliente ?? "__sem__",
```

Dois pedidos sem cliente geram dois grupos com ID `"__sem__"` → o DnD quebra silenciosamente.

**Fix:** Usar um ID estável derivado do índice ou de algum campo único: `group.codigoCliente ?? `__sem__${idx}``

---

## MENOR 8: `RotaMap` — `FitBounds` não refaz o fit quando `sortedPoints` muda após routing

**Arquivo: `RotaMap.tsx` linhas 88-100**

```typescript
function FitBounds({ points }: { points: Coords[] }) {
  const map = useMap();
  useEffect(() => { ... }, [points, map]);
}
```

`points` é recalculado via `useMemo` toda vez que `destinos` ou `geocodedCoords` mudam. O `useEffect` detecta a mudança por referência — OK. **Este bug NÃO existe atualmente.**

---

## MENOR 9: `RotaMap` — O índice dos Markers usa `sortedPoints.indexOf(p)` para determinar `type`

**Arquivo: `RotaMap.tsx` linha 238**

```typescript
const idx = sortedPoints.indexOf(p);
const type = idx === 0 ? "start" : idx === sortedPoints.length - 1 ? "end" : "middle";
```

`sortedPoints.indexOf(p)` compara por referência — correto porque `p` é o próprio objeto do array. **Este bug NÃO existe.** Porém, é desnecessariamente frágil; melhor usar `enumerate` via `sortedPoints.map((p, idx) => ...)`.

---

## MENOR 10: No Consolidado, a coluna "Carga" não aparece na versão desktop mesmo estando implementada

**Arquivo: `Consolidado.tsx` linhas 402-405**

Há um `SortableTableHead` para `data`, `status`, `tipoCaminhao`, `placa`, `motorista`... mas o `nomeCarga` não foi adicionado ao cabeçalho desktop (verifica-se que após linha 405 há mais conteúdo truncado).

---

## Resumo dos Fixes Necessários

| # | Severidade | Arquivo | Problema |
|---|---|---|---|
| 1 | CRÍTICO | `roteirizar/index.ts` | `trips_index` ≠ ordem de visita → usar `waypoint_index` |
| 2 | CRÍTICO | `RoteirizacaoDialog.tsx` | `trechos` na edge function agora inclui Goiânia→D1 em index 0, mapeamento `i+1` continua correto mas precisa validação |
| 3 | CRÍTICO | `RoteirizacaoDialog.tsx` | Dois clientes na mesma cidade → segundo ignorado na reordenação → usar `originalIndex` |
| 4 | MÉDIO | `RotaMap.tsx` | Cache não limpa erros null → retry nunca acontece |
| 5 | MÉDIO | `RoteirizacaoDialog.tsx` | IDs DnD colidem para múltiplos grupos sem `codigo_cliente` |
| 6 | MENOR | `RotaMap.tsx` | `sortedPoints.indexOf` frágil → usar `map(p, idx)` |

---

## Plano de Correção

### 1. `supabase/functions/roteirizar/index.ts`
- **Corrigir ordenação:** trocar `a.trips_index - b.trips_index` por `a.waypoint_index - b.waypoint_index`
- Adicionar log do `waypoint_index` para confirmar a ordem correta
- Verificar que `trechos[0]` = "Goiânia → Dest1" (incluindo a leg de origem)

### 2. `src/components/dashboard/RoteirizacaoDialog.tsx`
- **Corrigir reordenação pós-routing:** usar `opt.originalIndex` (retornado pela edge function) para mapear de volta ao grupo original em vez de `cidade+uf`
- **Corrigir IDs DnD:** usar `group.codigoCliente ?? \`__sem__${group.ordem}\`` como ID
- **Validar índice de trechos:** confirmar que com o fix do edge function, `i+1` funciona corretamente para "até próximo"

### 3. `src/components/dashboard/RotaMap.tsx`
- **Não cachear null:** no `geocodeCache`, só cachear resultados com coordenadas válidas para permitir retry em caso de falha temporária do Nominatim
- **Refatorar indexOf:** usar `sortedPoints.map((p, idx) => ...)` no render dos Markers

