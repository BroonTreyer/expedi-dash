import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface Destino {
  cidade: string;
  uf: string;
  cliente: string;
  lat?: number;
  lng?: number;
}

interface GeocodedDestino extends Destino {
  lat: number;
  lng: number;
  originalIndex: number;
}

// ── Supabase client (service role — bypasses RLS) ──────────────────────────
function getSupabase() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

// ── DB-first geocoding: batch lookup then Nominatim fallback ───────────────
async function geocodeViaNominatim(
  cidade: string,
  uf: string
): Promise<{ lat: number; lng: number } | null> {
  try {
    const q = encodeURIComponent(`${cidade}, ${uf}, Brasil`);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1&countrycodes=br`,
      { headers: { "User-Agent": "ExpediDash/2.0", "Accept-Language": "pt-BR" } }
    );
    const data = await res.json();
    if (data.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
  } catch {
    // ignore
  }
  return null;
}

/**
 * Batch geocode all destinations.
 * Priority: 1) already has lat/lng in input  2) DB cache  3) Nominatim (with save)
 * Returns a Map<"cidade,uf" → {lat, lng}>
 */
async function batchGeocode(
  destinos: Destino[],
  origemCidade: string,
  origemUf: string
): Promise<Map<string, { lat: number; lng: number }>> {
  const supabase = getSupabase();
  const result = new Map<string, { lat: number; lng: number }>();

  // Collect unique pairs (include origin)
  const uniquePairs = new Map<string, { cidade: string; uf: string }>();
  uniquePairs.set(`${origemCidade},${origemUf}`, {
    cidade: origemCidade,
    uf: origemUf,
  });
  for (const d of destinos) {
    uniquePairs.set(`${d.cidade},${d.uf}`, { cidade: d.cidade, uf: d.uf });
  }

  // Step 1: Use provided lat/lng from input
  for (const d of destinos) {
    if (d.lat != null && d.lng != null && d.lat !== 0 && d.lng !== 0) {
      result.set(`${d.cidade},${d.uf}`, { lat: d.lat, lng: d.lng });
    }
  }

  // Step 2: Query DB cache for all remaining unique pairs
  const missingPairs = Array.from(uniquePairs.values()).filter(
    (p) => !result.has(`${p.cidade},${p.uf}`)
  );

  if (missingPairs.length > 0) {
    const cidades = [...new Set(missingPairs.map((p) => p.cidade))];
    const { data: cached, error } = await supabase
      .from("geocode_cache")
      .select("cidade, uf, lat, lng")
      .in("cidade", cidades);

    if (!error && cached) {
      for (const row of cached) {
        const key = `${row.cidade},${row.uf}`;
        if (uniquePairs.has(key)) {
          result.set(key, { lat: row.lat, lng: row.lng });
          console.log(`[geocode] DB cache hit: ${key}`);
        }
      }
    }
  }

  // Step 3: Nominatim fallback for still-missing pairs (rare)
  const stillMissing = Array.from(uniquePairs.values()).filter(
    (p) => !result.has(`${p.cidade},${p.uf}`)
  );

  const toSaveToDb: { cidade: string; uf: string; lat: number; lng: number }[] = [];

  for (let i = 0; i < stillMissing.length; i++) {
    const { cidade, uf } = stillMissing[i];
    if (i > 0) await new Promise((r) => setTimeout(r, 600));

    let coords: { lat: number; lng: number } | null = null;
    for (const wait of [0, 2000, 4000]) {
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
      coords = await geocodeViaNominatim(cidade, uf);
      if (coords) break;
    }

    if (coords) {
      const key = `${cidade},${uf}`;
      result.set(key, coords);
      toSaveToDb.push({ cidade, uf, lat: coords.lat, lng: coords.lng });
      console.log(`[geocode] Nominatim: ${key} → ${coords.lat},${coords.lng}`);
    } else {
      console.warn(`[geocode] FAILED for ${cidade}, ${uf}`);
    }
  }

  // Step 4: Save new coords to DB for future use (fire-and-forget)
  if (toSaveToDb.length > 0) {
    supabase
      .from("geocode_cache")
      .upsert(toSaveToDb, { onConflict: "cidade,uf" })
      .then(({ error: e }) => {
        if (e) console.warn("[geocode] DB save error:", e.message);
        else console.log(`[geocode] Saved ${toSaveToDb.length} new entries to DB`);
      });
  }

  return result;
}

// ── Polyline decoder ───────────────────────────────────────────────────────
function decodePolyline(encoded: string): [number, number][] {
  const coords: [number, number][] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;
  while (index < encoded.length) {
    let b: number;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;
    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;
    coords.push([lat / 1e5, lng / 1e5]);
  }
  return coords;
}

/** Haversine distance in km */
function haversine(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Greedy nearest-neighbor sort */
function greedySort(
  origin: { lat: number; lng: number },
  destinations: GeocodedDestino[]
): GeocodedDestino[] {
  if (destinations.length <= 1) return destinations;
  const remaining = [...destinations];
  const sorted: GeocodedDestino[] = [];
  let current = origin;
  while (remaining.length > 0) {
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const d = haversine(
        current.lat,
        current.lng,
        remaining[i].lat,
        remaining[i].lng
      );
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }
    const [next] = remaining.splice(bestIdx, 1);
    sorted.push(next);
    current = { lat: next.lat, lng: next.lng };
  }
  return sorted;
}

// ── Main handler ───────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { destinos, origemCidade, origemUf } = (await req.json()) as {
      destinos: Destino[];
      origemCidade?: string;
      origemUf?: string;
    };

    if (!destinos || destinos.length === 0) {
      return new Response(
        JSON.stringify({ error: "Nenhum destino fornecido" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const oCidade = origemCidade || "Goiânia";
    const oUf = origemUf || "GO";

    // ── BATCH GEOCODE (DB-first, no artificial delays) ─────────────────────
    const coordsMap = await batchGeocode(destinos, oCidade, oUf);
    console.log(
      `[roteirizar] Geocoded ${coordsMap.size} unique city pairs (${destinos.length} destinations)`
    );

    const origemCoords = coordsMap.get(`${oCidade},${oUf}`) ?? null;

    // Build geocoded destination list
    const geocoded: GeocodedDestino[] = [];
    for (let i = 0; i < destinos.length; i++) {
      const d = destinos[i];
      const coords = coordsMap.get(`${d.cidade},${d.uf}`);
      if (!coords) {
        console.log(
          `[roteirizar] Skipping ${d.cidade}, ${d.uf} — no coords found`
        );
        continue;
      }
      geocoded.push({ ...d, lat: coords.lat, lng: coords.lng, originalIndex: i });
    }

    if (geocoded.length === 0) {
      return new Response(
        JSON.stringify({
          ordemOtimizada: [],
          geometria: [],
          distanciaTotal: 0,
          trechos: [],
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Apply small offset for same-city destinations
    const cityCount = new Map<string, number>();
    for (const g of geocoded) {
      const key = `${g.cidade}-${g.uf}`;
      const count = cityCount.get(key) ?? 0;
      if (count > 0) {
        g.lat += count * 0.003;
        g.lng += count * 0.003;
      }
      cityCount.set(key, count + 1);
    }

    if (geocoded.length < 2) {
      return new Response(
        JSON.stringify({
          ordemOtimizada: geocoded.map((g, i) => ({ ...g, ordem: i + 1 })),
          geometria: [],
          distanciaTotal: 0,
          trechos: [],
          origemLat: origemCoords?.lat ?? null,
          origemLng: origemCoords?.lng ?? null,
          origemCidadeNorm: oCidade,
          origemUfNorm: oUf,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── GREEDY PRE-SORT ────────────────────────────────────────────────────
    const originFallback = origemCoords ?? { lat: -16.6869, lng: -49.2648 };
    const greedilyOrdered = greedySort(originFallback, [...geocoded]);
    console.log(
      `[roteirizar] Greedy order: ${greedilyOrdered.map((g) => g.cidade).join(" → ")}`
    );

    const hasOrigin = !!origemCoords;
    const allPoints = hasOrigin
      ? [origemCoords!, ...greedilyOrdered.map((g) => ({ lat: g.lat, lng: g.lng }))]
      : greedilyOrdered.map((g) => ({ lat: g.lat, lng: g.lng }));

    const coordsStr = allPoints.map((p) => `${p.lng},${p.lat}`).join(";");

    let orderedDestinos: (GeocodedDestino & { ordem: number })[] = [];
    let geometry: [number, number][] = [];
    let distanciaTotal = 0;
    let trechos: { de: string; para: string; km: number; duracao: number }[] = [];
    let usedOsrmTrip = false;

    // ── OSRM /trip ─────────────────────────────────────────────────────────
    try {
      const osrmUrl = `https://router.project-osrm.org/trip/v1/driving/${coordsStr}?roundtrip=false&source=first&destination=last&geometries=polyline&overview=full&steps=false`;
      const osrmRes = await fetch(osrmUrl, {
        signal: AbortSignal.timeout(15000),
      });
      const osrmData = await osrmRes.json();

      console.log(
        `[roteirizar] OSRM trip code: ${osrmData.code}, trips: ${osrmData.trips?.length ?? 0}, waypoints: ${osrmData.waypoints?.length ?? 0}`
      );

      if (
        osrmData.code === "Ok" &&
        Array.isArray(osrmData.trips) &&
        osrmData.trips.length > 0 &&
        Array.isArray(osrmData.waypoints) &&
        osrmData.waypoints.length > 0 &&
        typeof osrmData.waypoints[0].waypoint_index === "number"
      ) {
        const trip = osrmData.trips[0];
        const waypoints: {
          waypoint_index: number;
          trips_index: number;
          name: string;
        }[] = osrmData.waypoints;

        const visitPosToInputIdx = new Map<number, number>();
        waypoints.forEach((wp, inputIdx) => {
          visitPosToInputIdx.set(wp.waypoint_index, inputIdx);
        });

        const totalVisitPositions = waypoints.length;
        console.log(
          `[roteirizar] OSRM trip visitPosToInputIdx: ${JSON.stringify(Array.from(visitPosToInputIdx.entries()))}`
        );

        orderedDestinos = [];
        for (let visitPos = 0; visitPos < totalVisitPositions; visitPos++) {
          if (hasOrigin && visitPos === 0) continue;
          const inputIdx = visitPosToInputIdx.get(visitPos);
          if (inputIdx == null) continue;
          const geoIdx = hasOrigin ? inputIdx - 1 : inputIdx;
          const g = greedilyOrdered[geoIdx];
          if (!g) {
            console.log(
              `[roteirizar] WARNING: geoIdx ${geoIdx} out of bounds`
            );
            continue;
          }
          orderedDestinos.push({ ...g, ordem: orderedDestinos.length + 1 });
        }

        geometry = decodePolyline(trip.geometry);
        distanciaTotal = Math.round((trip.distance / 1000) * 10) / 10;

        trechos = (trip.legs || []).map(
          (leg: { distance: number; duration: number }, i: number) => {
            const fromInputIdx = visitPosToInputIdx.get(i);
            const toInputIdx = visitPosToInputIdx.get(i + 1);
            const fromGeoIdx =
              fromInputIdx != null
                ? hasOrigin
                  ? fromInputIdx - 1
                  : fromInputIdx
                : -1;
            const toGeoIdx =
              toInputIdx != null
                ? hasOrigin
                  ? toInputIdx - 1
                  : toInputIdx
                : -1;
            const fromLabel =
              fromGeoIdx < 0
                ? oCidade
                : greedilyOrdered[fromGeoIdx]?.cidade ?? oCidade;
            const toLabel =
              toGeoIdx < 0
                ? oCidade
                : greedilyOrdered[toGeoIdx]?.cidade ?? "";
            return {
              de: fromLabel,
              para: toLabel,
              km: Math.round((leg.distance / 1000) * 10) / 10,
              duracao: Math.round(leg.duration / 60),
            };
          }
        );

        usedOsrmTrip = true;
        console.log(
          `[roteirizar] OSRM trip success. Order: ${orderedDestinos.map((d) => d.cidade).join(" → ")}`
        );
      }
    } catch (tripErr) {
      console.log(
        `[roteirizar] OSRM trip failed: ${(tripErr as Error).message}`
      );
    }

    // ── Fallback: OSRM /route with greedy order ────────────────────────────
    if (!usedOsrmTrip) {
      console.log(`[roteirizar] Falling back to OSRM /route with greedy order`);
      try {
        const routeUrl = `https://router.project-osrm.org/route/v1/driving/${coordsStr}?geometries=polyline&overview=full&steps=false`;
        const routeRes = await fetch(routeUrl, {
          signal: AbortSignal.timeout(8000),
        });
        const routeData = await routeRes.json();

        console.log(`[roteirizar] OSRM route code: ${routeData.code}`);

        if (
          routeData.code === "Ok" &&
          Array.isArray(routeData.routes) &&
          routeData.routes.length > 0
        ) {
          const route = routeData.routes[0];
          geometry = decodePolyline(route.geometry);
          distanciaTotal = Math.round((route.distance / 1000) * 10) / 10;

          const legs = route.legs || [];
          for (let i = 0; i < legs.length; i++) {
            const fromIdx = i - (hasOrigin ? 1 : 0);
            const toIdx = fromIdx + 1;
            trechos.push({
              de:
                fromIdx < 0
                  ? oCidade
                  : greedilyOrdered[fromIdx]?.cidade ?? oCidade,
              para:
                toIdx >= 0 && toIdx < greedilyOrdered.length
                  ? greedilyOrdered[toIdx]?.cidade ?? ""
                  : "",
              km: Math.round((legs[i].distance / 1000) * 10) / 10,
              duracao: Math.round(legs[i].duration / 60),
            });
          }
        }
      } catch (routeErr) {
        console.log(
          `[roteirizar] OSRM route also failed: ${(routeErr as Error).message}`
        );
      }

      orderedDestinos = greedilyOrdered.map((g, idx) => ({
        ...g,
        ordem: idx + 1,
      }));
    }

    return new Response(
      JSON.stringify({
        ordemOtimizada: orderedDestinos,
        geometria: geometry,
        distanciaTotal,
        trechos,
        origemLat: origemCoords?.lat ?? null,
        origemLng: origemCoords?.lng ?? null,
        origemCidadeNorm: oCidade,
        origemUfNorm: oUf,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error(`[roteirizar] Unhandled error: ${(err as Error).message}`);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
