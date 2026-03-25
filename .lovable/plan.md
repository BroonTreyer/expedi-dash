
## Root Cause Analysis — Why Markers Are Still Broken

After reading all files carefully, I found **4 critical bugs still present** that were not properly fixed in previous iterations:

---

### BUG A (CRITICAL): `RotaMap` re-geocodes on every render because `destinos` is a new array reference each time

In `RoteirizacaoDialog.tsx` line 285-288, `rotaDestinos` is a `useMemo` derived from `activeGroups`. Every time `setGroups` is called (e.g. after routing finishes), `activeGroups` changes → `rotaDestinos` gets a new array reference → the `useEffect` in `RotaMap` that depends on `destinos` fires again → geocoding runs again with the OLD `groups` order before the state fully stabilizes.

**The problem**: the `useEffect` in RotaMap triggers a new geocode run mid-routing, race conditions happen, and `abortRef` may not reliably cancel the previous run because `destinos` changes again right after `setGroups` resolves.

**Fix**: Add a stable `key` prop to `<RotaMap>` that only changes when routing completes (not during), OR deep-compare `destinos` in the useEffect to avoid re-geocoding when only `ordem` changes (since geocode only needs `cidade` + `uf`).

---

### BUG B (CRITICAL): OSRM `trip` endpoint with `roundtrip=false&destination=last` is unreliable for >5 points

The OSRM public demo server (`router.project-osrm.org`) often returns errors or wrong results for `trip` with `roundtrip=false`. The fallback to `/route` doesn't optimize at all. The **real fix** is to use OSRM `/route` but with a **nearest-neighbor greedy sort** done server-side before calling it, so at minimum the route is logical even if not globally optimal.

**Fix**: Keep the `/trip` call but add better error handling. If `trips_index` is missing or malformed, fall back to `/route` with the greedy-sorted order.

---

### BUG C (MEDIUM): Marker icons not updating after re-order because `MapContainer` doesn't re-mount

`MapContainer` from react-leaflet is intentionally not reactive to prop changes after mount. The `center` and `zoom` props are only initial values. When `sortedPoints` changes after routing, the markers update correctly — but if the `MapContainer` has stale state, markers may show old icons.

**Fix**: Add a `key` to `MapContainer` that changes when the set of destinations changes (e.g. based on `destinos.length` + city names hash), forcing a full re-mount when destinations change substantially.

---

### BUG D (MEDIUM): `trechos` index mismatch in card list

In `RoteirizacaoDialog.tsx` line 354: `trecho={trechos?.[idx]}`. The `groups` array (all groups, including excluded) is iterated, but `trechos` from OSRM only covers active destinations. So `idx` for an excluded group between two included groups shifts all subsequent `trechos` indices.

**Fix**: Build a separate map of `codigoCliente → trecho` based on the `ordemOtimizada` response from the edge function, keyed by destination. Or only iterate active groups when rendering cards.

---

## Definitive Fix Plan

### 1. `src/components/dashboard/RotaMap.tsx`
- Add deep comparison in `useEffect`: only re-geocode when `cidade+uf` set changes, not just `ordem`
- Add `key` to `MapContainer` derived from sorted city+uf string — forces re-mount when destinations change, preventing stale leaflet state
- Fix `FitBounds` to also fire when `points` length changes (currently only fires on mount because `useMap` doesn't change)

### 2. `supabase/functions/roteirizar/index.ts`  
- Add `console.log` debugging of OSRM response to understand what's actually being returned
- Add defensive check: if `waypoints` array items don't have `trips_index`, fall back gracefully
- Implement server-side **greedy nearest-neighbor sort** as pre-sort before calling OSRM, so the `/route` fallback also returns an optimized order
- The greedy sort: start from Goiânia coords, repeatedly pick the closest unvisited destination

### 3. `src/components/dashboard/RoteirizacaoDialog.tsx`
- Fix `trechos` card mapping: build a `Map<codigoCliente, TrechoInfo>` from `ordemOtimizada` results rather than using array index
- Pass `trechos` keyed to destination from the edge function response
- Prevent auto-route from firing when `handleRoteirizar` is already in-flight (add guard)

### 4. `src/components/dashboard/FechamentoLoteDialog.tsx` (minor)
- The `rotaDestinos` memo is already correct — no changes needed here

---

## Summary of Changes

| File | Change |
|---|---|
| `RotaMap.tsx` | Deep-compare destinos, re-mount MapContainer on city set change |
| `roteirizar/index.ts` | Add greedy NN sort + defensive OSRM checks + logs |
| `RoteirizacaoDialog.tsx` | Fix trechos key mapping, guard duplicate routing calls |
