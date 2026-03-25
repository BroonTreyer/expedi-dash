
## Root Cause

The network responses confirm `"geometria":[]` and `"trechos":[]` — the haversine fallback code exists but never executes in time. The logs show `Total time: 20234ms`, meaning the edge function runs for over 20 seconds before the Supabase worker kills it.

**Sequence of failure:**
1. OSRM `/trip` called with 8s timeout → times out
2. OSRM `/route` called with 5s timeout → times out  
3. Total: ~13s of OSRM waiting + function overhead = >20s
4. Supabase edge function is killed before the `catch(routeErr)` fallback can write `trechos` and `geometry` to the response

**Fix: drastically cut timeouts and run both OSRM calls in parallel**

Instead of sequential trip → route, fire both simultaneously with a `Promise.race` / `Promise.allSettled`. Use 3s timeout per call. If both fail (typically within 3s now instead of 13s), the haversine fallback runs at ~3s total, well within limits.

## What to Change

**`supabase/functions/roteirizar/index.ts`**

Replace the sequential trip→route flow with parallel execution:

```
// Run /trip and /route at the same time, 3s timeout each
const [tripResult, routeResult] = await Promise.allSettled([
  fetch(osrmTripUrl, { signal: AbortSignal.timeout(3000) }).then(r => r.json()),
  fetch(osrmRouteUrl, { signal: AbortSignal.timeout(3000) }).then(r => r.json()),
]);

// Try to use trip result first, then route result, then haversine fallback
```

This means:
- When OSRM is available: both calls succeed in ~1-2s, result is used normally
- When OSRM is down: both fail in 3s, haversine fallback runs at ~3-4s total (safe)
- The function always finishes in under 8s regardless of OSRM status

The haversine fallback already correctly builds `trechos` and `geometry` — it just never gets to run in time with the current sequential 13s approach.

## Files to Edit

| File | Change |
|---|---|
| `supabase/functions/roteirizar/index.ts` | Replace sequential trip→route OSRM calls (lines ~423-594) with parallel `Promise.allSettled` pattern, using 3s timeouts per call |
