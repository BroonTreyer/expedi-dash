
## Diagnóstico Real dos Bugs

### BUG 1 — CRÍTICO: `mapKey = citySetKey` destrói e recria o MapContainer durante o geocoding

O `MapContainer` usa `key={mapKey}` onde `mapKey = citySetKey`. Quando o dialog abre:
1. `citySetKey` é calculado → MapContainer é montado (zoom 4, Brasil)
2. Geocoding começa async → `sortedPoints` ainda vazio
3. Geocoding termina → `setGeocodedCoords(coordMap)` → `sortedPoints` é populado
4. **Mas `citySetKey` não mudou**, então o MapContainer **não** é recriado → os Markers aparecem corretamente... em teoria.

O problema real: quando `setGroups()` roda após o OSRM retornar (reordenando grupos), `rotaDestinos` (useMemo) é recalculado com nova ordem → `citySetKey` muda (pois usa `destinos.map(d => \`${d.cidade},${d.uf}\`)` e a ordem mudou? Não, a ordem não entra no citySetKey porque usa `.sort()`.

**ENCONTREI O BUG REAL**: Na linha 150-153 do RotaMap:
```typescript
const citySetKey = useMemo(() => {
  const pairs = Array.from(new Set(destinos.map((d) => `${d.cidade},${d.uf}`))).sort();
  const origemKey = origem ? `__origem__${origem.cidade},${origem.uf}` : "";
  return pairs.join("|") + origemKey;
}, [destinos, origem]);
```

O `origem` prop é passado como **objeto inline** `origem={{ cidade: "Goiânia", uf: "GO" }}` no JSX do RoteirizacaoDialog (linha 372). Cada render do RoteirizacaoDialog cria um novo objeto `{ cidade: "Goiânia", uf: "GO" }` → `useMemo([destinos, origem])` recomputa porque `origem` é nova referência → `citySetKey` muda → `mapKey` muda → **MapContainer é destruído e recriado**. Isso acontece em todo render intermediário durante o routing (`setIsRouting(true)`, etc.), recriando o mapa sem os markers.

Quando o MapContainer é recriado, o novo `useEffect` geocoding começa mas o `mapKey` continua mudando se o pai re-renderiza.

### BUG 2 — CRÍTICO: Marcador de origem "O" usa letra mas deveria usar "0" ou ícone de casa

O ícone do ponto de partida está correto visualmente, mas o problema de não aparecer é causado pelo BUG 1 (MapContainer destruído antes de `origemCoords` ser populado).

### BUG 3 — CRÍTICO (edge function): `findIndex` com `waypoint_index` pode retornar duplicatas

Na linha 247 do edge function:
```typescript
const inputIdx = osrmData.waypoints.findIndex((w) => w.waypoint_index === wp.waypoint_index);
```

Isso encontra o **primeiro** waypoint com aquele `waypoint_index`. Se dois waypoints tiverem o mesmo `waypoint_index` (bug edge case no OSRM), o segundo destino sempre mapeia para o mesmo grupo. Além disso, a lógica de `sortedByVisit` -> `destinationWps` -> `findIndex` é redundante e frágil. O array `waypoints` do OSRM já vem indexado na mesma posição do input — o waypoint `i` corresponde ao ponto `allPoints[i]`. Portanto, para obter a ordem de visita, basta iterar `waypoints` por posição de input e associar `waypoint_index` a cada um.

**Fix correto**: usar o índice do array `osrmData.waypoints` diretamente (posição no input), não `findIndex` com `waypoint_index` como critério de busca. Construir um mapa `waypoint_index → inputIndex` antes de qualquer operação.

### BUG 4 — A rota OSRM não é a mais curta porque usa `/trip` com `source=first&destination=last`

O OSRM `/trip` com `roundtrip=false&source=first&destination=last` faz o melhor TSP com origem fixa e destino livre. Mas a greedy pre-sort já ordena os pontos de forma razoável antes de enviar para o OSRM. O problema é que o OSRM `/trip` com muitos waypoints no servidor público pode ter degradação. **Para rotas no Brasil especificamente**, o OSRM público `router.project-osrm.org` usa dados mundiais e pode não ter estradas brasileiras completas — causando rotas subótimas.

A solução mais robusta: quando o OSRM `/trip` falha ou retorna rota ruim, garantir que o **fallback greedy** já produz uma ordem lógica. O greedy atual usa coordenadas geocodificadas com Haversine, que é correto.

## Plano de Correção

### Fix 1 — `RotaMap.tsx`: Estabilizar `origem` com `useMemo` e desacoplar `mapKey` de `citySetKey`

**Problema**: `mapKey = citySetKey` faz o MapContainer ser destruído quando qualquer coisa muda.

**Solução**: 
- O `MapContainer` NÃO deve ser recriado quando a ordem dos destinos muda ou quando `origemCoords` é populado. Usar `mapKey` apenas para forçar recriação quando o **conjunto de cidades** muda genuinamente (quando o usuário abre o dialog com pedidos diferentes).
- Separar `mapKey` (para destruição do MapContainer) de `citySetKey` (para trigger do geocoding). O `mapKey` pode ser um `useRef` incrementado apenas na primeira montagem ou quando a lista de cidades muda entre sessões de dialog.
- Passar `origem` como prop **estabilizado** no RoteirizacaoDialog (com `useMemo` ou `useRef` para evitar nova referência a cada render).

**Implementação concreta**:

Em `RotaMap.tsx`:
```typescript
// mapKey só muda quando o conjunto de cidades muda de fato — não a cada re-render
const mapKeyRef = useRef(0);
const prevCitySetKeyRef = useRef("");
if (prevCitySetKeyRef.current !== citySetKey) {
  prevCitySetKeyRef.current = citySetKey;
  mapKeyRef.current++;
}
const mapKey = mapKeyRef.current;
```

Em `RoteirizacaoDialog.tsx`:
```typescript
// Estabilizar origem — evitar novo objeto a cada render
const origemRota = useMemo(() => ({ cidade: "Goiânia", uf: "GO" }), []);
// ...
<RotaMap origem={origemRota} ... />
```

### Fix 2 — `supabase/functions/roteirizar/index.ts`: Corrigir mapeamento de waypoints

Substituir o frágil `findIndex` por mapeamento direto via índice do array:

```typescript
// ANTES (frágil — findIndex pode retornar duplicata):
const inputIdx = osrmData.waypoints.findIndex((w) => w.waypoint_index === wp.waypoint_index);

// DEPOIS (correto — mapear waypoint_index → inputIndex por posição):
// osrmData.waypoints[i] = o waypoint que corresponde ao input allPoints[i]
// waypoint.waypoint_index = onde ele aparece na rota otimizada
const waypointIndexToInputIndex = new Map<number, number>();
osrmData.waypoints.forEach((wp: any, i: number) => {
  waypointIndexToInputIndex.set(wp.waypoint_index, i);
});

// Para obter a ordem de visita: iterar de 0..N por waypoint_index
for (let visitPos = 0; visitPos < waypoints.length; visitPos++) {
  const inputIdx = waypointIndexToInputIndex.get(visitPos)!;
  // ...
}
```

### Fix 3 — `RotaMap.tsx`: Garantir que o marcador de origem é exibido mesmo antes do geocoding completar para destinos

O marcador de origem (`origemCoords`) é gerenciado separadamente dos destinos. Se `origemCoords` já foi geocodificado (está no cache) mas `geocodedCoords` ainda está sendo populado, o mapa deve mostrar o marcador de origem imediatamente. Isso já funciona com o fix do `mapKey` (MapContainer não é destruído durante o async).

### Arquivos a editar

| Arquivo | Mudança |
|---|---|
| `src/components/dashboard/RotaMap.tsx` | `mapKey` independente de renders intermediários; usar `useRef` para estabilidade do MapContainer |
| `src/components/dashboard/RoteirizacaoDialog.tsx` | Estabilizar prop `origem` com `useMemo` |
| `supabase/functions/roteirizar/index.ts` | Substituir `findIndex` frágil por mapeamento direto via `waypointIndexToInputIndex` |
| `src/components/dashboard/FechamentoLoteDialog.tsx` | Garantir que `origem` também é estabilizado |
