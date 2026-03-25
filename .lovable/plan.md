
## Problem: Only 1 Marker Shows on Map

### Root Cause Analysis

After reading the full code, I found **two compounding bugs** that cause most markers to disappear:

**BUG 1 — Race condition aborts geocoding mid-run**

In `RotaMap.tsx`, the `useEffect` for geocoding depends on `citySetKey`. The `citySetKey` is a `useMemo` but the `origem` prop is passed as an **inline object literal** (`origem={{ cidade: "Goiânia", uf: "GO" }}`) from the parent. Even though `citySetKey` uses string values (not references), there's a race: `RoteirizacaoDialog` calls `setGroups()` after routing completes → `rotaDestinos` memo recomputes → `RotaMap` receives new `destinos` → `citySetKey` changes (because `destinos.sort()` order changed) → `abortRef.current++` → the in-progress geocode async loop checks `if (run !== abortRef.current) return` and **exits early without ever calling `setGeocodedCoords`**.

Result: `geocodedCoords` stays empty → `sortedPoints` is empty → no markers rendered (or only 1 that was already in cache from before).

**BUG 2 — `needsFetch` check exits early without setting state for already-cached cities**

In the `!needsFetch` early-exit branch (lines 171-183), `setGeocodedCoords` IS called correctly. But the `needsFetch` check uses `geocodeCache.has(key)` — the module-level cache. After an aborted run, some cities may be in the module cache but `geocodedCoords` (component state) is still empty. The next time `citySetKey` changes, `needsFetch` could be `false` (all cities in module cache) so the early-exit fires and sets state correctly. BUT if `citySetKey` does NOT change again after the abort, the component is stuck with empty `geocodedCoords`.

**Summary**: After routing completes, `setGroups` reorders groups → `rotaDestinos` is a new array with same cities but different order → `citySetKey` is **identical** (sorted unique pairs don't change) → `useEffect` does NOT re-fire → `geocodedCoords` stays as whatever it was last set to (possibly empty from a prior aborted run).

### Fix Plan

**`src/components/dashboard/RotaMap.tsx`** — 3 changes:

1. **Decouple `citySetKey` from `ordem`** (already done, stable) — but fix the abort-then-no-retry problem by making `citySetKey` **also trigger** a synchronous read from the module cache when `geocodedCoords` is empty (i.e., add a secondary `useMemo` that reads directly from `geocodeCache` and populates state without going async):
   - Add a `useEffect` that runs after geocoding completes AND after any `citySetKey` change: if `geocodedCoords` is empty but all cities are in the module-level `geocodeCache`, populate from cache immediately (synchronously, no abort risk).

2. **Fix the abort logic**: Change the abort check from being inside the async loop to only checking at the very end before `setGeocodedCoords`. This way even if a new run starts, the previous run still completes setting state (the latest run will overwrite with the same data anyway since cities didn't change).
   - Remove `if (run !== abortRef.current) return` from inside the loop; only keep the final check before `setGeocodedCoords` and `setOrigemCoords`.

3. **Simplify the abort pattern**: Instead of aborting mid-loop, let all geocoding complete and only reject the `setState` if a newer run has started. Since geocoding for the same cities produces the same result, there's no harm in the last write winning.

**Concrete code changes:**

```typescript
// BEFORE: aborts mid-loop on citySetKey change
for (const pair of uniquePairs) {
  if (run !== abortRef.current) return; // ← TOO AGGRESSIVE: aborts before setting state
  ...
}

// AFTER: let the loop complete, only discard if stale at the end
for (const pair of uniquePairs) {
  // removed abort check inside loop
  ...
}
if (run !== abortRef.current) return; // only final check
setGeocodedCoords(coordMap);
setOrigemCoords(origCoords);
setLocalLoading(false);
```

This is the minimal, targeted fix. Files to edit:

| File | Change |
|---|---|
| `src/components/dashboard/RotaMap.tsx` | Remove mid-loop abort checks; only abort at final setState |
