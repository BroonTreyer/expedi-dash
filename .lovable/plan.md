
## Auditoria Completa — Bugs Encontrados

### BUG 1: Marcadores no lugar errado (geocodificação paralela + offset de mesma cidade)
**Arquivo: `RotaMap.tsx` linhas 119-141**

O `cityCount` Map é compartilhado entre callbacks assíncronos. Como as geocodificações correm em paralelo com `Promise.all`, o `cityCount.get(key)` lê o estado antes de qualquer callback terminar, então TODOS retornam `count = 0` — o offset não funciona. Resultado: marcadores de mesma cidade ficam sobrepostos.

**Fix:** Separar a fase de geocodificação da fase de offset. Primeiro, aguardar todos os geocodes, depois aplicar o offset sequencialmente nos resultados já resolvidos.

---

### BUG 2: Marcadores não aparecem (key duplicada no Marker)
**Arquivo: `RotaMap.tsx` linha 198**

`key={${p.cidade}-${p.uf}-${p.ordem}}` — quando a rota é re-otimizada, o `ordem` muda mas `cidade+uf` pode colidir com marcadores antigos. Além disso, após roteirizar, os `destinos` passados ao mapa ainda podem ter a ordem antiga até o próximo render. 

**Fix:** Usar `key={${p.cidade}-${p.uf}-${p.ordem}}` é aceitável, mas a causa real é que os `destinos` no mapa são derivados de `activeGroups` com `useMemo`, e após a roteirização a atualização de `groups` via `setGroups` pode não refletir imediatamente. 

O problema principal: o `rotaDestinos` no `RoteirizacaoDialog` usa `activeGroups` que filtra por `excludedGroupKeys` e só reflete grupos após `setGroups` — OK por si. Mas durante `isRouting=true`, o mapa recebe `loading=true` e mostra overlay, porém os destinos que chegam ao mapa ainda têm a ordem ANTIGA porque a geocodificação no RotaMap roda novamente mas os `destinos` prop ainda não foram atualizados naquele render.

---

### BUG 3: Bolinhas com número errado (ordem não sincroniza com resultado OSRM)
**Arquivo: `RoteirizacaoDialog.tsx` linhas 237-247 + `RotaMap.tsx` linha 194**

Após roteirizar, `setGroups` atualiza com a nova ordem, mas `rotaDestinos` (derivado de `activeGroups`) correto. Porém o mapa usa `p.ordem` como número exibido na bolinha — esse número vem do `destino.ordem` que é passado pelo `rotaDestinos`. O `rotaDestinos` usa `activeGroups` que reflete `groups` corretamente.

**PROBLEMA REAL:** Na edge function, o mapeamento de `waypoints` está errado. O OSRM retorna `waypoint_index` que é o índice do waypoint de INPUT, não a posição na rota otimizada. O código atual tenta usar `waypoints.indexOf(a)` para ordenar — mas `waypoints` é um array e `.indexOf` compara por referência, não por `waypoint_index`. **Isso significa que a ordem otimizada retornada pela edge function é sempre a ordem original, não a ordem OSRM.**

**Fix no edge function:** A ordenação dos destinos deve ser pelo campo `trip_index` (posição na viagem otimizada), que é o campo correto do OSRM. O campo `waypoint_index` indica o índice do ponto no input; o campo que indica a ordem na trip é o índice na posição do array `waypoints` já ordenado por `trip_index` — na realidade o OSRM `trip` retorna os waypoints JÁ em ordem de viagem otimizada. A ordenação atual com `waypoints.indexOf` é um no-op ineficaz.

---

### BUG 4: Trechos associados ao card errado
**Arquivo: `RoteirizacaoDialog.tsx` linha 343**

`trecho={trechos?.[idx - 1]}` — o índice 0 recebe `trechos[-1]` = `undefined` (ok), índice 1 recebe `trechos[0]` que é o trecho "Goiânia → Destino 1" (trecho da origem), não o trecho "Destino 1 → Destino 2". O trecho mostrado no card deveria ser o trecho DE chegada naquele destino vindo do anterior.

Mas há outro problema: os `trechos` retornados pela edge function incluem o trecho Goiânia → Destino1 (leg 0). Então `trechos[0]` = Goiânia→D1, `trechos[1]` = D1→D2, etc. O card na posição `idx=0` (ordem 1) deveria mostrar o trecho de chegada (Goiânia→ele), mas `trechos?.[idx - 1]` = `trechos[-1]` = undefined. O card `idx=1` mostra `trechos[0]` = Goiânia→D1 — errado, deveria mostrar D1→D2.

**Fix:** Os trechos incluem a leg de origem. Card de índice `idx` deve receber `trechos?.[idx]` (o trecho de saída daquele destino para o próximo), pois o trecho de chegada já está na leg anterior que inclui a origem.

---

### BUG 5: Roteirização com apenas 1 destino não limpa geometria
**Arquivo: `RoteirizacaoDialog.tsx` linhas 221-224**

Quando há apenas 1 destino (ou 0 com cidade/uf), a função retorna cedo sem limpar `routeGeometry` e `trechos` anteriores. Se o usuário remover destinos e clicar Roteirizar, o mapa ainda mostra a rota antiga.

**Fix:** Limpar `setRouteGeometry(undefined)`, `setTrechos(undefined)`, `setDistanciaTotal(undefined)` antes de qualquer early return.

---

### BUG 6: OSRM waypoints sort é incorreto (bug crítico na edge function)
**Arquivo: `supabase/functions/roteirizar/index.ts` linhas 203-210**

```typescript
const destWaypoints = waypoints
  .filter(...)
  .sort((a, b) => {
    const aPos = waypoints.indexOf(a);  // BUG: indexOf de objeto sempre retorna o índice original
    const bPos = waypoints.indexOf(b);
    return aPos - bPos;
  });
```

O OSRM `/trip` retorna `waypoints` com campo `trips_index` (índice do trip) e o índice do array já representa a ordem de input. Para obter a ordem otimizada, deve-se ordenar por `trips_index` ou usar diretamente o índice no array de `trips[0].legs`. O campo correto para ordenar pela viagem otimizada é `trips_index` no waypoint.

**Fix:** Ordenar por `a.trips_index - b.trips_index` (campo correto do OSRM).

---

### BUG 7: `roteirizacaoResult` não é limpo entre sessões
**Arquivo: `src/pages/Index.tsx` linha 68**

Quando o usuário abre Fechar Carga diretamente (sem passar por Roteirizar), `roteirizacaoResult` ainda pode ter dados da última roteirização com pedidos DIFERENTES. O `FechamentoLoteDialog` usa esses grupos antigos ao invés de construir do zero com os pedidos selecionados.

**Fix:** Ao abrir `loteDialogOpen` diretamente (sem passar por `onAdvance`), limpar `roteirizacaoResult`. Ao abrir `roteirizacaoOpen`, também limpar para evitar dados velhos.

---

### BUG 8: Mapa dentro de `FechamentoLoteDialog` não aparece quando não há roteirização
**Arquivo: `FechamentoLoteDialog.tsx` linha 163**

O mapa só renderiza se `roteirizacao?.routeGeometry` existe. Se o usuário foi direto para Fechar Carga sem roteirizar, não há mapa. Isso é intencional conforme o plano, mas o mapa deve aparecer com marcadores mesmo sem rota.

**Fix:** Mostrar o mapa sempre (com apenas markers) quando há destinos com cidade/uf, independente de ter geometria ou não.

---

## Plano de Correção

### 1. `supabase/functions/roteirizar/index.ts`
- Corrigir ordenação dos waypoints: usar `a.trips_index - b.trips_index` ao invés de `waypoints.indexOf`
- Corrigir mapeamento `geoIdx`: o `trips_index` indica qual waypoint de input; subtrair 1 se há origem
- Simplificar construção de `trechos` — iterar sobre `orderedDestinos` já em ordem correta

### 2. `src/components/dashboard/RotaMap.tsx`
- Corrigir geocodificação paralela: primeiro resolver todos os geocodes, depois aplicar offset sequencialmente
- Corrigir key dos Markers para ser estável: usar `${p.cidade}-${p.uf}-${p.ordem}`

### 3. `src/components/dashboard/RoteirizacaoDialog.tsx`
- Limpar geometria/trechos antes de chamar a edge function (no início de `handleRoteirizar`)
- Corrigir índice dos trechos no card: `trechos?.[idx]` ao invés de `trechos?.[idx - 1]`
- Limpar estados ao fechar o dialog

### 4. `src/pages/Index.tsx`
- Limpar `roteirizacaoResult` ao abrir roteirização
- Limpar `roteirizacaoResult` ao abrir Fechar Carga diretamente (sem roteirizar)

### 5. `src/components/dashboard/FechamentoLoteDialog.tsx`
- Mostrar mapa sempre que houver destinos com cidade/uf, mesmo sem geometria
