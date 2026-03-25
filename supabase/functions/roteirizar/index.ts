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

async function geocode(cidade: string, uf: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const q = encodeURIComponent(`${cidade}, ${uf}, Brasil`);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1&countrycodes=br`,
      { headers: { "User-Agent": "ExpediDash/1.0", "Accept-Language": "pt-BR" } }
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

/** Haversine distance in km between two points */
function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Greedy nearest-neighbor sort starting from an origin point.
 * Returns geocoded destinations in optimized order.
 */
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
      const d = haversine(current.lat, current.lng, remaining[i].lat, remaining[i].lng);
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
      return new Response(JSON.stringify({ error: "Nenhum destino fornecido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Geocode origin (default: Goiânia-GO)
    const oCidade = origemCidade || "Goiânia";
    const oUf = origemUf || "GO";
    const origemCoords = await geocode(oCidade, oUf);

    // Geocode all destinations sequentially
    const geocoded: GeocodedDestino[] = [];
    for (let i = 0; i < destinos.length; i++) {
      const d = destinos[i];
      let lat = d.lat;
      let lng = d.lng;
      if (lat == null || lng == null || lat === 0 || lng === 0) {
        const coords = await geocode(d.cidade, d.uf);
        if (!coords) {
          console.log(`[roteirizar] Geocode failed for: ${d.cidade}, ${d.uf}`);
          continue;
        }
        lat = coords.lat;
        lng = coords.lng;
      }
      geocoded.push({ ...d, lat: lat!, lng: lng!, originalIndex: i });
    }

    console.log(`[roteirizar] Geocoded ${geocoded.length}/${destinos.length} destinations`);

    if (geocoded.length === 0) {
      return new Response(
        JSON.stringify({ ordemOtimizada: [], geometria: [], distanciaTotal: 0, trechos: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Apply small offset for same-city destinations (sequential, no race condition)
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
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- GREEDY PRE-SORT (guarantees a logical order even if OSRM fails) ---
    const originFallback = origemCoords ?? { lat: -16.6869, lng: -49.2648 }; // Goiânia
    const greedilyOrdered = greedySort(originFallback, [...geocoded]);
    console.log(`[roteirizar] Greedy order: ${greedilyOrdered.map((g) => g.cidade).join(" → ")}`);

    // Build waypoints for OSRM: origin first, then greedy-sorted destinations
    const hasOrigin = !!origemCoords;
    const allPoints = hasOrigin
      ? [origemCoords!, ...greedilyOrdered.map((g) => ({ lat: g.lat, lng: g.lng }))]
      : greedilyOrdered.map((g) => ({ lat: g.lat, lng: g.lng }));

    const coordsStr = allPoints.map((p) => `${p.lng},${p.lat}`).join(";");

    // Try OSRM /trip for global optimization
    let orderedDestinos: (GeocodedDestino & { ordem: number })[] = [];
    let geometry: [number, number][] = [];
    let distanciaTotal = 0;
    let trechos: { de: string; para: string; km: number; duracao: number }[] = [];

    let usedOsrmTrip = false;

    try {
      const osrmUrl = `https://router.project-osrm.org/trip/v1/driving/${coordsStr}?roundtrip=false&source=first&destination=last&geometries=polyline&overview=full&steps=false`;
      const osrmRes = await fetch(osrmUrl, { signal: AbortSignal.timeout(8000) });
      const osrmData = await osrmRes.json();

      console.log(`[roteirizar] OSRM trip code: ${osrmData.code}, trips: ${osrmData.trips?.length ?? 0}, waypoints: ${osrmData.waypoints?.length ?? 0}`);

      if (
        osrmData.code === "Ok" &&
        Array.isArray(osrmData.trips) &&
        osrmData.trips.length > 0 &&
        Array.isArray(osrmData.waypoints) &&
        osrmData.waypoints.length > 0 &&
        typeof osrmData.waypoints[0].waypoint_index === "number"
      ) {
        const trip = osrmData.trips[0];
        const waypoints: { waypoint_index: number; trips_index: number; name: string }[] = osrmData.waypoints;

        // FIX CRÍTICO: trips_index = qual trip (sempre 0 num único trip), NÃO é a ordem de visita.
        // waypoint_index = posição na sequência de visita do trip. Ordenar por waypoint_index.
        const sortedByVisit = [...waypoints].sort((a, b) => a.waypoint_index - b.waypoint_index);

        console.log(`[roteirizar] OSRM trip sorted by waypoint_index: ${JSON.stringify(sortedByVisit.map((w) => ({ wi: w.waypoint_index, ti: w.trips_index })))}`);

        // Map back: waypoint at position 0 in visit order = origin (when hasOrigin), positions 1..N = destinations
        const destinationWps = sortedByVisit.filter((_, pos) => !(hasOrigin && pos === 0));

        // Each destination wp's original input index is its position in allPoints array minus 1 for origin
        // allPoints = [origin, greedilyOrdered[0], greedilyOrdered[1], ...]
        // waypoints[i] corresponds to allPoints[i], so waypoints[i].waypoint_index tells us visit order
        // We need to map from input position → greedilyOrdered index
        // The input index of each waypoint is its index in the original osrmData.waypoints array
        const inputIndexByWaypoint = new Map<typeof sortedByVisit[0], number>();
        osrmData.waypoints.forEach((wp: { waypoint_index: number; trips_index: number }, i: number) => {
          inputIndexByWaypoint.set(wp, i);
        });

        orderedDestinos = destinationWps.map((wp, idx) => {
          // Find the original input index of this waypoint
          const inputIdx = osrmData.waypoints.findIndex((w: { waypoint_index: number }) => w.waypoint_index === wp.waypoint_index);
          const geoIdx = hasOrigin ? inputIdx - 1 : inputIdx;
          const g = greedilyOrdered[geoIdx];
          if (!g) {
            console.log(`[roteirizar] WARNING: geoIdx ${geoIdx} out of bounds (inputIdx=${inputIdx}, greedilyOrdered.length=${greedilyOrdered.length})`);
            return null;
          }
          return { ...g, ordem: idx + 1 };
        }).filter((d): d is GeocodedDestino & { ordem: number } => d !== null);

        geometry = decodePolyline(trip.geometry);
        distanciaTotal = Math.round((trip.distance / 1000) * 10) / 10;

        // Build trechos from trip legs in visit order
        // trechos[0] = origem → dest1, trechos[1] = dest1 → dest2, etc.
        trechos = (trip.legs || []).map((leg: { distance: number; duration: number }, i: number) => {
          const fromWp = sortedByVisit[i];
          const toWp = sortedByVisit[i + 1];
          const fromInputIdx = osrmData.waypoints.findIndex((w: { waypoint_index: number }) => w.waypoint_index === fromWp.waypoint_index);
          const toInputIdx = toWp ? osrmData.waypoints.findIndex((w: { waypoint_index: number }) => w.waypoint_index === toWp.waypoint_index) : -1;
          const fromGeoIdx = hasOrigin ? fromInputIdx - 1 : fromInputIdx;
          const toGeoIdx = hasOrigin ? toInputIdx - 1 : toInputIdx;
          const fromLabel = fromGeoIdx < 0 ? oCidade : (greedilyOrdered[fromGeoIdx]?.cliente ?? oCidade);
          const toLabel = toGeoIdx < 0 ? oCidade : (greedilyOrdered[toGeoIdx]?.cliente ?? "");
          return {
            de: fromLabel,
            para: toLabel,
            km: Math.round((leg.distance / 1000) * 10) / 10,
            duracao: Math.round(leg.duration / 60),
          };
        });

        usedOsrmTrip = true;
        console.log(`[roteirizar] OSRM trip success. Order: ${orderedDestinos.map((d) => d.cidade).join(" → ")}`);
      }
    } catch (tripErr) {
      console.log(`[roteirizar] OSRM trip failed: ${(tripErr as Error).message}`);
    }

    // Fallback: use /route with greedy pre-sorted order (already logical)
    if (!usedOsrmTrip) {
      console.log(`[roteirizar] Falling back to OSRM /route with greedy order`);
      try {
        const routeUrl = `https://router.project-osrm.org/route/v1/driving/${coordsStr}?geometries=polyline&overview=full&steps=false`;
        const routeRes = await fetch(routeUrl, { signal: AbortSignal.timeout(8000) });
        const routeData = await routeRes.json();

        console.log(`[roteirizar] OSRM route code: ${routeData.code}`);

        if (routeData.code === "Ok" && Array.isArray(routeData.routes) && routeData.routes.length > 0) {
          const route = routeData.routes[0];
          geometry = decodePolyline(route.geometry);
          distanciaTotal = Math.round((route.distance / 1000) * 10) / 10;

          const legs = route.legs || [];
          const startLeg = hasOrigin ? 1 : 0;
          for (let i = startLeg; i < legs.length; i++) {
            const fromIdx = i - (hasOrigin ? 1 : 0);
            const toIdx = fromIdx + 1;
            trechos.push({
              de: fromIdx < 0 ? oCidade : (greedilyOrdered[fromIdx]?.cliente ?? ""),
              para: greedilyOrdered[toIdx]?.cliente ?? "",
              km: Math.round((legs[i].distance / 1000) * 10) / 10,
              duracao: Math.round(legs[i].duration / 60),
            });
          }
        }
      } catch (routeErr) {
        console.log(`[roteirizar] OSRM route also failed: ${(routeErr as Error).message}`);
      }

      // Use greedy order as the optimized order
      orderedDestinos = greedilyOrdered.map((g, idx) => ({ ...g, ordem: idx + 1 }));
    }

    return new Response(
      JSON.stringify({
        ordemOtimizada: orderedDestinos,
        geometria: geometry,
        distanciaTotal,
        trechos,
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
