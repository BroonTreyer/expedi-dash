
## Diagnóstico dos 2 Bugs

### BUG 1 — Só aparece 1 marcador no mapa (dos 6 esperados)

**Causa raiz**: O `geocodeCache` é uma `Map` definida no **escopo do módulo** (`const geocodeCache = new Map()`). Isso significa que ele é **compartilhado entre todos os renders e persiste durante toda a sessão**. Na primeira vez que o dialog abre, o geocoding funciona e popula o cache. Na segunda ou terceira abertura do dialog (com os **mesmos pedidos**), o `needsFetch` avalia que tudo está em cache → chama `buildFromCache()` e sai sem ir async. 

O problema real está na linha 241:
```typescript
// Só descarta se um run mais novo com cidades DIFERENTES começou
if (run !== abortRef.current) return;
```

O `abortRef.current` é incrementado com `++abortRef.current` no início de CADA chamada ao `useEffect`. Quando o dialog reabre, `open` → `items` → `useEffect(open, items)` no `RoteirizacaoDialog` roda, chama `setShouldAutoRoute(true)` → componente re-renderiza → `shouldAutoRoute=true` + `groups.length >= 2` → `handleRoteirizar()` dispara → `setIsRouting(true)` causa novo render → `RotaMap` recebe nova referência de `rotaDestinos` (mesmo conteúdo, novo array via `useMemo`) mas `citySetKey` é **idêntico** (mesmas cidades). 

Portanto `mapKeyRef` NÃO incrementa. O `useEffect([citySetKey])` também NÃO re-executa. **O `geocodedCoords` permanece com o valor do render anterior** — que pode ser um `Map` vazio se o componente foi desmontado e remontado (dialog fecha e abre → React desmonta e remonta o `RotaMap` lazy-loaded → `useState` reseta para `new Map()` vazio → `citySetKey` não mudou entre dois mounts → `useEffect` **NÃO dispara na remontagem porque a dep não mudou de undefined para algo**).

**Esse é o bug central**: quando o `MapContainer` (e o `RotaMap` inteiro) é desmontado e remontado (ao fechar/abrir o Dialog, ou Suspense remontando), o `useState(new Map())` começa vazio. O `useEffect([citySetKey])` compara a dep com o valor **anterior do hook** — mas como o componente foi desmontado, ele não tem "anterior". React **sempre executa** o `useEffect` no primeiro mount. MAS: `citySetKey` com as mesmas cidades → `buildFromCache()` popula corretamente se tudo está em cache → **deveria funcionar**.

Investigando mais: o **verdadeiro** problema é o `abortRef.current`. Quando o `RotaMap` remonta:
1. `abortRef.current = 0` (novo ref)
2. `useEffect` roda: `run = ++abortRef.current = 1`
3. `needsFetch = false` (tudo em cache) → `buildFromCache()` → retorna CEDO (`return`)
4. `setGeocodedCoords(coordMap)` é chamado — **correto**

Então por que os marcadores somem? Olhando a imagem: o mapa mostra **somente o marcador 2** (Rondonópolis) com a rota passando apenas por MT. Isso sugere que o **OSRM /trip** retornou com sucesso mas com `orderedDestinos` incompleto — apenas 1 destino mapeado (geoIdx fora de bounds) — e a função `setGroups` reordenou para apenas 1 grupo ativo.

**BUG 1 REAL**: Na linha 256-262 do edge function:
```typescript
const geoIdx = hasOrigin ? inputIdx - 1 : inputIdx;
const g = greedilyOrdered[geoIdx];
```

`greedilyOrdered` tem os destinos na **ordem greedy**, mas `inputIdx` é a posição em `allPoints` que contém `[origemCoords, ...greedilyOrdered]`. Se `visitPos=1` → `inputIdx=visitPosToInputIdx.get(1)`, mas o mapa `visitPosToInputIdx` mapeia `waypoint_index → inputIdx`. O OSRM pode retornar `waypoints[0].waypoint_index = 0` (origem), `waypoints[1].waypoint_index = 3` (4º ponto como 2ª visita), etc. 

Para `visitPos = 1` (1ª visita após origem), se `inputIdx = visitPosToInputIdx.get(1)` retornar, por exemplo, `inputIdx = 4`, então `geoIdx = 4 - 1 = 3`. Se `greedilyOrdered.length = 6`, isso funcionaria. Mas se apenas 1 destino foi geocodificado (os outros 5 falharam), `greedilyOrdered` tem length=1, e todos os `geoIdx >= 1` retornam `undefined` → `WARNING: geoIdx X out of bounds` → `continue` → `orderedDestinos` fica com apenas 1 elemento.

**Confirmando**: O Nominatim está falhando para a maioria das cidades na edge function (rate limit) → `geocoded.length = 1` → `greedilyOrdered` tem 1 elemento → `setGroups` reconstrói com apenas 1 grupo → `rotaDestinos` tem apenas 1 destino → `sortedPoints` renderiza 1 marcador.

**Por que geocoded.length = 1?** Porque o primeiro geocode (origem) já consome a cota do Nominatim. O delay de `if (i > 0)` só aplica entre destinos, **mas não há delay entre o geocode da ORIGEM e o primeiro destino (i=0)**. Linha 134: `geocode(oCidade, oUf)` sem delay, depois linha 143: `if (i > 0) await delay(350)` — quando `i=0`, não tem delay → duas requests sem delay → Nominatim silencia as seguintes.

### BUG 2 — Mover bloco não atualiza a rota no mapa

**Causa**: As funções `moveUp`, `moveDown`, `moveToPosition` e `handleDragEnd` chamam `setGroups(renumber(arr))`. Isso atualiza `groups` e consequentemente `activeGroups` e `rotaDestinos`. O mapa recebe novos `destinos` com novas `ordem` values.

Mas a `routeGeometry`, `distanciaTotal` e `trechos` **não são limpos quando o usuário move manualmente**. O mapa continua exibindo a geometria antiga (que correspondia à ordem antiga). Os `trechos` no card também ficam desatualizados.

Além disso, o `citySetKey` é calculado por **conjunto de cidades** (sorted unique) — não leva em conta a **ordem** dos destinos. Portanto mover um bloco não recalcula o mapa (correto para não regeocoder), mas a geometria da rota antiga não faz sentido com a nova ordem. A rota deveria ser recalculada automaticamente quando o usuário reordena os blocos.

**Fix**: Limpar `routeGeometry`, `distanciaTotal` e `trechos` (ou re-roteirizar automaticamente) sempre que `groups` mudar via drag/move, indicando visualmente que a rota precisa ser recalculada.

## Plano de Correção

### Fix 1 — Edge function `supabase/functions/roteirizar/index.ts`

Adicionar delay **antes** do primeiro destino (i=0) também, garantindo delay após geocode da origem:
```typescript
// ANTES:
const origemCoords = await geocode(oCidade, oUf);
for (let i = 0; i < destinos.length; i++) {
  if (i > 0) await delay(350); // ← sem delay para i=0!

// DEPOIS:
const origemCoords = await geocode(oCidade, oUf);
await delay(400); // delay após origem, antes do primeiro destino
for (let i = 0; i < destinos.length; i++) {
  if (i > 0) await delay(400);
```

### Fix 2 — `RotaMap.tsx`: Forçar re-geocoding quando componente remonta com cache vazio

O `useEffect([citySetKey])` não re-executa se `citySetKey` não mudou entre dois mounts. Adicionar uma dependência de montagem usando um ref que detecta se o componente remontou com `geocodedCoords` vazio:

```typescript
// Após o componente remontar, se geocodedCoords está vazio mas o cache tem os dados, popular imediatamente
const mountedRef = useRef(0);
useEffect(() => {
  mountedRef.current++; // incrementa a cada mount
}, []);
```

OU mais simples: trocar a dep do `useEffect` de `[citySetKey]` para `[citySetKey, mountedRef.current]` — não funciona porque ref não dispara re-render.

**Solução mais simples e correta**: usar um `key` no próprio `RotaMap` dentro do `RoteirizacaoDialog` baseado em `open` (dialog aberto). Quando `open=false → true`, o `RotaMap` remonta e o `useEffect` sempre executa (React sempre roda effects no mount). Como `buildFromCache` está correto, isso populará os `geocodedCoords` imediatamente.

```tsx
// RoteirizacaoDialog.tsx
const mapInstanceKey = useMemo(() => (open ? "open" : "closed"), [open]);
// ...
<RotaMap key={mapInstanceKey} ... />
```

Não — isso recriaria o MapContainer toda vez que o dialog abre.

**Solução real e cirúrgica**: No `useEffect([citySetKey])` do `RotaMap`, **sempre** executar `buildFromCache()` no início antes do check de `needsFetch`, para garantir que o estado seja populado mesmo se `citySetKey` não mudou entre dois mounts:

Na verdade, o React **sempre** executa `useEffect` no primeiro mount de um componente, independente das deps. Então isso deve funcionar. O problema pode ser outro.

**Investigando de novo**: O `Dialog` usa `open` prop. Quando `open=false`, o `DialogContent` pode ser mantido no DOM com `display:none` (depende da implementação) ou desmontado. Verificando o shadcn Dialog — ele **desmonta** o conteúdo quando `open=false`. Logo o `RotaMap` e `MapContainer` são desmontados. Quando o dialog reabre, o `RotaMap` monta do zero, `geocodedCoords = new Map()`, `useEffect` roda → `buildFromCache()` → deveria popular.

O verdadeiro bug dos marcadores sumindo é o **edge function geocoding falhando** (Fix 1), não o front-end. O front-end está correto — ele renderiza o que a edge function retorna via `setGroups`.

### Fix 3 — `RoteirizacaoDialog.tsx`: Limpar rota ao mover blocos manualmente

Nas funções `moveUp`, `moveDown`, `moveToPosition` e `handleDragEnd`, adicionar limpeza da geometria antiga:

```typescript
const clearRoute = useCallback(() => {
  setRouteGeometry(undefined);
  setDistanciaTotal(undefined);
  setTrechos(undefined);
}, []);

const moveUp = (idx: number) => {
  clearRoute(); // ← adicionar
  if (idx === 0) return; 
  setGroups(...);
};
// idem para moveDown, moveToPosition, handleDragEnd
```

Isso faz o mapa exibir apenas os marcadores (sem a linha de rota antiga/inválida) após reordenação manual, deixando claro que o usuário precisa clicar "Roteirizar" para recalcular.

## Arquivos a editar

| Arquivo | Mudança |
|---|---|
| `supabase/functions/roteirizar/index.ts` | Adicionar delay de 400ms ANTES do primeiro destino (após geocode da origem) para evitar rate-limit do Nominatim |
| `src/components/dashboard/RoteirizacaoDialog.tsx` | Limpar `routeGeometry/distanciaTotal/trechos` ao mover blocos via drag, moveUp, moveDown, moveToPosition |
