import { createClient } from "npm:@supabase/supabase-js@2";

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

// ── Normalize city name: UPPERCASE + no accents ────────────────────────────
function normalizarCidade(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .trim();
}

// ── Supabase client (service role — bypasses RLS) ──────────────────────────
function getSupabase() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

// ── Nominatim fallback ─────────────────────────────────────────────────────
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
 */
async function batchGeocode(
  destinos: Destino[],
  origemCidade: string,
  origemUf: string
): Promise<Map<string, { lat: number; lng: number }>> {
  const supabase = getSupabase();
  const result = new Map<string, { lat: number; lng: number }>();

  const uniquePairs = new Map<string, { cidade: string; uf: string }>();
  const origemNorm = normalizarCidade(origemCidade);
  const origemUfUp = origemUf.toUpperCase().trim();
  uniquePairs.set(`${origemNorm},${origemUfUp}`, { cidade: origemNorm, uf: origemUfUp });

  for (const d of destinos) {
    const cn = normalizarCidade(d.cidade);
    const un = d.uf.toUpperCase().trim();
    uniquePairs.set(`${cn},${un}`, { cidade: cn, uf: un });
  }

  // Step 1: Use provided lat/lng from input
  for (const d of destinos) {
    if (d.lat != null && d.lng != null && d.lat !== 0 && d.lng !== 0) {
      const cn = normalizarCidade(d.cidade);
      const un = d.uf.toUpperCase().trim();
      result.set(`${cn},${un}`, { lat: d.lat, lng: d.lng });
    }
  }

  // Step 2: Query DB cache — single batch query
  const missingPairs = Array.from(uniquePairs.values()).filter(
    (p) => !result.has(`${p.cidade},${p.uf}`)
  );

  if (missingPairs.length > 0) {
    const cidades = [...new Set(missingPairs.map((p) => p.cidade))];
    console.log(`[geocode] Querying DB for ${cidades.length} unique cities`);
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
    } else if (error) {
      console.warn(`[geocode] DB query error: ${error.message}`);
    }
  }

  // Step 3: Nominatim fallback for still-missing pairs
  const stillMissing = Array.from(uniquePairs.values()).filter(
    (p) => !result.has(`${p.cidade},${p.uf}`)
  );

  if (stillMissing.length > 0) {
    console.log(`[geocode] Nominatim fallback for ${stillMissing.length} cities`);
  }

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

/** Haversine distance in km */
function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
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

/** Total route distance (origin + ordered destinations) */
function routeDistance(
  origin: { lat: number; lng: number },
  route: { lat: number; lng: number }[]
): number {
  if (route.length === 0) return 0;
  let total = haversine(origin.lat, origin.lng, route[0].lat, route[0].lng);
  for (let i = 0; i < route.length - 1; i++) {
    total += haversine(route[i].lat, route[i].lng, route[i + 1].lat, route[i + 1].lng);
  }
  return total;
}

/** Greedy nearest-neighbor sort */
function greedySort<T extends { lat: number; lng: number }>(
  origin: { lat: number; lng: number },
  destinations: T[]
): T[] {
  if (destinations.length <= 1) return destinations;
  const remaining = [...destinations];
  const sorted: T[] = [];
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

/** 2-opt swap: reverse segment from i+1 to k */
function twoOptSwap<T>(route: T[], i: number, k: number): T[] {
  return [
    ...route.slice(0, i + 1),
    ...route.slice(i + 1, k + 1).reverse(),
    ...route.slice(k + 1),
  ];
}

/** 2-opt local search improvement over greedy result */
function twoOptImprove<T extends { lat: number; lng: number }>(
  origin: { lat: number; lng: number },
  destinations: T[]
): T[] {
  if (destinations.length <= 3) return destinations;
  let route = [...destinations];
  let improved = true;
  let iterations = 0;
  // BUG 14 FIX: Increase max iterations for larger routes (21 cities needs ~200+)
  const maxIterations = Math.max(500, destinations.length * destinations.length);

  while (improved && iterations < maxIterations) {
    improved = false;
    iterations++;
    // BUG 16 FIX: Recalculate currentDist at the start of each outer iteration
    // so inner loop comparisons always use the latest best distance
    let currentDist = routeDistance(origin, route);
    for (let i = 0; i < route.length - 1; i++) {
      for (let k = i + 1; k < route.length; k++) {
        const newRoute = twoOptSwap(route, i, k);
        const newDist = routeDistance(origin, newRoute);
        if (newDist < currentDist - 0.1) {
          route = newRoute;
          // BUG 16 FIX: Update currentDist immediately after each improvement
          currentDist = newDist;
          improved = true;
          break; // restart inner loop with new best
        }
      }
      if (improved) break;
    }
  }
  console.log(`[2-opt] Completed in ${iterations} iterations (max=${maxIterations})`);
  return route;
}

/**
 * City-level deduplication:
 * Collapse multiple destinations in the same city into one representative point.
 * Returns unique city groups; each group has a representative lat/lng.
 */
interface CityGroup {
  cityKey: string; // "CIDADE,UF"
  lat: number;
  lng: number;
  members: GeocodedDestino[]; // all destinations in this city
}

function buildCityGroups(geocoded: GeocodedDestino[]): CityGroup[] {
  const map = new Map<string, CityGroup>();
  for (const g of geocoded) {
    const key = `${normalizarCidade(g.cidade)},${g.uf.toUpperCase().trim()}`;
    if (!map.has(key)) {
      map.set(key, { cityKey: key, lat: g.lat, lng: g.lng, members: [] });
    }
    map.get(key)!.members.push(g);
  }
  return Array.from(map.values());
}

// ── Main handler ───────────────────────────────────────────────────────────
// ── Route cache helpers ────────────────────────────────────────────────────
async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function buildCacheKey(
  origemCidade: string,
  origemUf: string,
  destinos: Destino[],
  preserveOrder: boolean,
  pref: "fastest" | "shortest" = "fastest",
): Promise<string> {
  const oNorm = `${normalizarCidade(origemCidade)},${origemUf.toUpperCase().trim()}`;
  const pairs = destinos.map(
    (d) => `${normalizarCidade(d.cidade)},${d.uf.toUpperCase().trim()}`,
  );
  // When preserveOrder is true, the order is meaningful → keep it in the key.
  // Otherwise we may sort to maximize cache hits (since optimization output is order-invariant).
  const dNorm = preserveOrder ? pairs.join("|") : [...pairs].sort().join("|");
  const tag = preserveOrder ? "ORD" : "OPT";
  const prefTag = pref === "shortest" ? "ECON" : "FAST";
  return await sha256Hex(`${tag}:${prefTag}>>${oNorm}>>${dNorm}`);
}

async function readRouteCache(cacheKey: string, maxAgeDays = 30): Promise<any | null> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from("route_cache")
    .select("*")
    .eq("cache_key", cacheKey)
    .maybeSingle();
  if (!data) return null;
  const ageDays = (Date.now() - new Date(data.last_used_at).getTime()) / 86400000;
  if (ageDays > maxAgeDays) return null;
  // Bump usage stats (fire-and-forget)
  supabase
    .from("route_cache")
    .update({ last_used_at: new Date().toISOString(), hit_count: (data.hit_count ?? 0) + 1 })
    .eq("cache_key", cacheKey)
    .then(() => {});
  return data;
}

async function readRouteCacheStale(cacheKey: string): Promise<any | null> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from("route_cache")
    .select("*")
    .eq("cache_key", cacheKey)
    .maybeSingle();
  return data ?? null;
}

async function writeRouteCache(
  cacheKey: string,
  origem: string,
  destinos: Destino[],
  km: number,
  duracao: number,
  geometry: [number, number][],
  ordemOtimizada: any[],
  provider: string,
  pedagios: [number, number][] = [],
): Promise<void> {
  const supabase = getSupabase();
  await supabase.from("route_cache").upsert(
    {
      cache_key: cacheKey,
      origem,
      destinos: destinos as any,
      km_total: km,
      duracao_min: duracao,
      geometry: geometry as any,
      ordem_otimizada: ordemOtimizada as any,
      provider,
      pedagios: pedagios as any,
      last_used_at: new Date().toISOString(),
    },
    { onConflict: "cache_key" }
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: claims, error: claimsError } = await anonClient.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (claimsError || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const destinos = body?.destinos as Destino[] | undefined;
    const origemCidade = body?.origemCidade as string | undefined;
    const origemUf = body?.origemUf as string | undefined;
    const preserveOrder = body?.preserveOrder === true;
    // mode: "fastest" | "cheapest" | "both" (default both)
    const mode = (body?.mode as string | undefined) ?? "both";

    if (!destinos || destinos.length === 0) {
      return new Response(
        JSON.stringify({ error: "Nenhum destino fornecido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const oCidade = origemCidade || "Goiânia";
    const oUf = origemUf || "GO";
    const oCidadeNorm = normalizarCidade(oCidade);
    const oUfNorm = oUf.toUpperCase().trim();

    const t0 = Date.now();

    // ── CACHE LOOKUP (fast variant only — used as legacy single-route response) ─
    const cacheKeyFast = await buildCacheKey(oCidade, oUf, destinos, preserveOrder, "fastest");
    const cacheKeyEcon = await buildCacheKey(oCidade, oUf, destinos, preserveOrder, "shortest");
    if (mode !== "both") {
      const cached = await readRouteCache(mode === "cheapest" ? cacheKeyEcon : cacheKeyFast);
      if (cached) {
        return new Response(
          JSON.stringify({
            ordemOtimizada: cached.ordem_otimizada || [],
            geometria: cached.geometry || [],
            distanciaTotal: cached.km_total ?? 0,
            trechos: [],
            pedagios: cached.pedagios || [],
            estimado: cached.provider === "haversine",
            fromCache: true,
            origemCidadeNorm: oCidadeNorm,
            origemUfNorm: oUfNorm,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      const [cF, cE] = await Promise.all([readRouteCache(cacheKeyFast), readRouteCache(cacheKeyEcon)]);
      if (cF && cE) {
        console.log(`[roteirizar] Cache hit (both)`);
        return new Response(
          JSON.stringify({
            // Legacy fields point to fastest
            ordemOtimizada: cF.ordem_otimizada || [],
            geometria: cF.geometry || [],
            distanciaTotal: cF.km_total ?? 0,
            trechos: [],
            pedagios: cF.pedagios || [],
            estimado: cF.provider === "haversine",
            rotas: {
              rapida: {
                ordemOtimizada: cF.ordem_otimizada || [],
                geometria: cF.geometry || [],
                distanciaTotal: cF.km_total ?? 0,
                duracaoMin: cF.duracao_min ?? null,
                trechos: [],
                pedagios: cF.pedagios || [],
              },
              economica: {
                ordemOtimizada: cE.ordem_otimizada || [],
                geometria: cE.geometry || [],
                distanciaTotal: cE.km_total ?? 0,
                duracaoMin: cE.duracao_min ?? null,
                trechos: [],
                pedagios: cE.pedagios || [],
              },
            },
            fromCache: true,
            origemCidadeNorm: oCidadeNorm,
            origemUfNorm: oUfNorm,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // ── BATCH GEOCODE ──────────────────────────────────────────────────────
    const coordsMap = await batchGeocode(destinos, oCidade, oUf);
    console.log(
      `[roteirizar] Geocoded ${coordsMap.size} unique city pairs in ${Date.now() - t0}ms`
    );

    const origemCoords = coordsMap.get(`${oCidadeNorm},${oUfNorm}`) ?? null;

    // Build geocoded destination list (NO coordinate offsets — those are frontend-only)
    const geocoded: GeocodedDestino[] = [];
    for (let i = 0; i < destinos.length; i++) {
      const d = destinos[i];
      const cn = normalizarCidade(d.cidade);
      const un = d.uf.toUpperCase().trim();
      const coords = coordsMap.get(`${cn},${un}`);
      if (!coords) {
        console.log(`[roteirizar] Skipping ${d.cidade}, ${d.uf} — no coords found`);
        continue;
      }
      // Store real coordinates without any offset
      geocoded.push({ ...d, lat: coords.lat, lng: coords.lng, originalIndex: i });
    }

    if (geocoded.length === 0) {
      return new Response(
        JSON.stringify({ ordemOtimizada: [], geometria: [], distanciaTotal: 0, trechos: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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
          origemCidadeNorm: oCidadeNorm,
          origemUfNorm: oUfNorm,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── CITY-LEVEL DEDUPLICATION ───────────────────────────────────────────
    // Group destinations by unique city. Send only 1 point per city to OSRM.
    const cityGroups = buildCityGroups(geocoded);
    console.log(
      `[roteirizar] ${geocoded.length} destinations → ${cityGroups.length} unique cities`
    );

    // ── ORDER: preserve user order OR optimize ─────────────────────────────
    const originFallback = origemCoords ?? { lat: -16.6869, lng: -49.2648 };
    let optimizedGroups: typeof cityGroups;
    if (preserveOrder) {
      optimizedGroups = cityGroups;
      console.log(
        `[roteirizar] preserveOrder=true → keeping user order (${cityGroups.length} cities): ${cityGroups.map((g) => g.cityKey).join(" → ")}`,
      );
    } else {
      const greedySorted = greedySort(originFallback, [...cityGroups]);
      optimizedGroups = twoOptImprove(originFallback, greedySorted);
      const twoOptDist = routeDistance(originFallback, optimizedGroups);
      console.log(
        `[roteirizar] 2-opt order (${optimizedGroups.length} cities, ${twoOptDist.toFixed(0)}km): ${optimizedGroups.map((g) => g.cityKey).join(" → ")}`,
      );
    }
    const twoOptDist = routeDistance(originFallback, optimizedGroups);

    // Points for ORS: origin + one unique coord per city
    const hasOrigin = !!origemCoords;
    const allPoints = hasOrigin
      ? [origemCoords!, ...optimizedGroups.map((g) => ({ lat: g.lat, lng: g.lng }))]
      : optimizedGroups.map((g) => ({ lat: g.lat, lng: g.lng }));

    let orderedGroups: CityGroup[] = optimizedGroups; // default to 2-opt result

    // ── OpenRouteService API (real road routing) ──────────────────────────
    const ORS_API_KEY = Deno.env.get("ORS_API_KEY");

    type Variant = {
      geometry: [number, number][];
      distanciaTotal: number;
      duracaoMin: number;
      trechos: { de: string; para: string; km: number; duracao: number }[];
      pedagios: [number, number][];
      usedOrs: boolean;
    };

    async function callOrs(pref: "fastest" | "shortest"): Promise<Variant | null> {
      if (!ORS_API_KEY) return null;
      try {
        const orsCoordinates = allPoints.map((p) => [p.lng, p.lat]);
        const orsRes = await fetch(
          "https://api.openrouteservice.org/v2/directions/driving-car/geojson",
          {
            method: "POST",
            headers: {
              "Authorization": ORS_API_KEY,
              "Content-Type": "application/json",
              "Accept": "application/json, application/geo+json",
            },
            body: JSON.stringify({
              coordinates: orsCoordinates,
              instructions: false,
              geometry_simplify: false,
              preference: pref,
              extra_info: ["tollways"],
              radiuses: orsCoordinates.map(() => 5000),
            }),
            signal: AbortSignal.timeout(8000),
          }
        );
        if (!orsRes.ok) {
          const errText = await orsRes.text();
          throw new Error(`ORS HTTP ${orsRes.status}: ${errText}`);
        }
        const orsData = await orsRes.json();
        const feature = orsData?.features?.[0];
        const props = feature?.properties;
        if (!feature || !props) throw new Error("ORS response missing features");

        const geometry = (feature.geometry.coordinates as [number, number][]).map(
          ([lng, lat]) => [lat, lng] as [number, number]
        );
        const distanciaTotal = Math.round((props.summary.distance / 1000) * 10) / 10;
        const duracaoMin = Math.round((props.summary.duration ?? 0) / 60);
        const trechos: { de: string; para: string; km: number; duracao: number }[] = [];
        const segments: { distance: number; duration: number }[] = props.segments || [];
        for (let i = 0; i < segments.length; i++) {
          const fromIdx = i - (hasOrigin ? 1 : 0);
          const toIdx = fromIdx + 1;
          trechos.push({
            de: fromIdx < 0 ? oCidade : orderedGroups[fromIdx]?.members[0]?.cidade ?? oCidade,
            para: toIdx >= 0 && toIdx < orderedGroups.length
              ? orderedGroups[toIdx]?.members[0]?.cidade ?? ""
              : "",
            km: Math.round((segments[i].distance / 1000) * 10) / 10,
            duracao: Math.round(segments[i].duration / 60),
          });
        }
        // Extract pedagio markers from extras.tollways.values
        const pedagios: [number, number][] = [];
        const tollVals: [number, number, number][] | undefined = props.extras?.tollways?.values;
        if (Array.isArray(tollVals)) {
          const seen = new Set<string>();
          for (const [startIdx, , value] of tollVals) {
            if (value === 1 && geometry[startIdx]) {
              const pt = geometry[startIdx];
              const k = `${pt[0].toFixed(3)},${pt[1].toFixed(3)}`;
              if (!seen.has(k)) {
                seen.add(k);
                pedagios.push([pt[0], pt[1]]);
              }
            }
          }
        }
        return { geometry, distanciaTotal, duracaoMin, trechos, pedagios, usedOrs: true };
      } catch (e) {
        console.warn(`[roteirizar] ORS ${pref} failed: ${(e as Error).message}`);
        return null;
      }
    }

    // Run both variants in parallel when needed
    const wantBoth = mode === "both";
    const wantFast = mode === "both" || mode === "fastest" || !mode;
    const wantEcon = mode === "both" || mode === "cheapest";

    let [vFast, vEcon] = await Promise.all([
      wantFast ? callOrs("fastest") : Promise.resolve(null),
      wantEcon ? callOrs("shortest") : Promise.resolve(null),
    ]);

    // ── OSRM alternatives fallback ──────────────────────────────────────────
    // Quando o ORS recusa as duas variantes (ex.: rota > 6.000 km — código 2004),
    // pedimos ao OSRM público até 3 rotas alternativas e usamos a mais rápida e a
    // mais curta para preencher os botões "Mais Rápida" / "Mais Econômica".
    if (!vFast && !vEcon && (wantFast || wantEcon)) {
      try {
        const coordsStr = allPoints.map((p) => `${p.lng},${p.lat}`).join(";");
        const osrmAltUrl = `https://router.project-osrm.org/route/v1/driving/${coordsStr}?overview=full&geometries=geojson&steps=false&alternatives=2`;
        console.log(`[roteirizar] Tentando OSRM alternativas (${allPoints.length} waypoints)`);
        const osrmAltRes = await fetch(osrmAltUrl, { signal: AbortSignal.timeout(10000) });
        if (!osrmAltRes.ok) throw new Error(`OSRM alt HTTP ${osrmAltRes.status}`);
        const osrmAltData = await osrmAltRes.json();
        const routes: Array<{ geometry: { coordinates: [number, number][] }; distance: number; duration: number; legs: { distance: number; duration: number }[] }> = osrmAltData?.routes ?? [];
        if (routes.length > 0) {
          const buildVariant = (route: typeof routes[0]): Variant => {
            const geometry = (route.geometry.coordinates).map(
              ([lng, lat]) => [lat, lng] as [number, number]
            );
            const distanciaTotalV = Math.round((route.distance / 1000) * 10) / 10;
            const duracaoMin = Math.round((route.duration ?? 0) / 60);
            const trechosV: { de: string; para: string; km: number; duracao: number }[] = [];
            const legs = route.legs || [];
            for (let i = 0; i < legs.length; i++) {
              const fromIdx = i - (hasOrigin ? 1 : 0);
              const toIdx = fromIdx + 1;
              trechosV.push({
                de: fromIdx < 0 ? oCidade : orderedGroups[fromIdx]?.members[0]?.cidade ?? oCidade,
                para: toIdx >= 0 && toIdx < orderedGroups.length
                  ? orderedGroups[toIdx]?.members[0]?.cidade ?? ""
                  : "",
                km: Math.round((legs[i].distance / 1000) * 10) / 10,
                duracao: Math.round(legs[i].duration / 60),
              });
            }
            return { geometry, distanciaTotal: distanciaTotalV, duracaoMin, trechos: trechosV, pedagios: [], usedOrs: true };
          };
          // Mais Rápida = menor duração; Mais Econômica = menor distância
          const fastest = [...routes].sort((a, b) => (a.duration ?? 0) - (b.duration ?? 0))[0];
          const shortest = [...routes].sort((a, b) => a.distance - b.distance)[0];
          vFast = buildVariant(fastest);
          // Só preenche econômica se for de fato uma rota diferente da rápida
          vEcon = shortest === fastest ? null : buildVariant(shortest);
          console.log(`[roteirizar] OSRM alternativas: ${routes.length} rotas (rápida=${vFast.distanciaTotal}km/${vFast.duracaoMin}min, econômica=${vEcon ? `${vEcon.distanciaTotal}km/${vEcon.duracaoMin}min` : "N/A"})`);
        } else {
          console.warn(`[roteirizar] OSRM alternatives sem rotas`);
        }
      } catch (e) {
        console.warn(`[roteirizar] OSRM alternatives falhou: ${(e as Error).message}`);
      }
    }

    let geometry: [number, number][] = [];
    let distanciaTotal = 0;
    let trechos: { de: string; para: string; km: number; duracao: number }[] = [];
    let pedagios: [number, number][] = [];
    let estimado = false;
    let usedOrs = false;

    // Pick primary variant for legacy single-route response
    const primary = vFast ?? vEcon;
    if (primary) {
      geometry = primary.geometry;
      distanciaTotal = primary.distanciaTotal;
      trechos = primary.trechos;
      pedagios = primary.pedagios;
      usedOrs = true;
    }

    // ── Haversine fallback — when ORS is unavailable ───────────────────────
    if (!usedOrs) {
      // ── OSRM público (sem chave) — antes do haversine ─────────────────
      try {
        const coordsStr = allPoints.map((p) => `${p.lng},${p.lat}`).join(";");
        const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${coordsStr}?overview=full&geometries=geojson&steps=false`;
        console.log(`[roteirizar] Tentando OSRM público (${allPoints.length} waypoints)`);
        const osrmRes = await fetch(osrmUrl, { signal: AbortSignal.timeout(8000) });
        if (!osrmRes.ok) throw new Error(`OSRM HTTP ${osrmRes.status}`);
        const osrmData = await osrmRes.json();
        const route = osrmData?.routes?.[0];
        if (route && route.geometry?.coordinates?.length > 1) {
          geometry = (route.geometry.coordinates as [number, number][]).map(
            ([lng, lat]) => [lat, lng] as [number, number]
          );
          distanciaTotal = Math.round((route.distance / 1000) * 10) / 10;
          trechos = [];
          const legs: { distance: number; duration: number }[] = route.legs || [];
          for (let i = 0; i < legs.length; i++) {
            const fromIdx = i - (hasOrigin ? 1 : 0);
            const toIdx = fromIdx + 1;
            trechos.push({
              de: fromIdx < 0 ? oCidade : orderedGroups[fromIdx]?.members[0]?.cidade ?? oCidade,
              para: toIdx >= 0 && toIdx < orderedGroups.length
                ? orderedGroups[toIdx]?.members[0]?.cidade ?? ""
                : "",
              km: Math.round((legs[i].distance / 1000) * 10) / 10,
              duracao: Math.round(legs[i].duration / 60),
            });
          }
          usedOrs = true; // marca como rota real (não estimada)
          estimado = false;
          console.log(`[roteirizar] OSRM aceito: ${distanciaTotal}km, ${geometry.length} pontos, ${trechos.length} trechos`);
          // Popula variantes a partir do OSRM single-route quando o fallback de
          // alternativas não conseguiu (ou não foi disparado). Garante que os
          // botões "Mais Rápida" / "Mais Econômica" tenham conteúdo.
          const duracaoMinSingle = trechos.reduce((s, t) => s + (t.duracao || 0), 0);
          const variantSingle: Variant = {
            geometry,
            distanciaTotal,
            duracaoMin: duracaoMinSingle,
            trechos,
            pedagios: [],
            usedOrs: true,
          };
          if (wantFast && !vFast) vFast = variantSingle;
          if (wantEcon && !vEcon) vEcon = variantSingle;
        } else {
          throw new Error("OSRM sem rotas");
        }
      } catch (osrmErr) {
        console.warn(`[roteirizar] OSRM falhou: ${(osrmErr as Error).message} — caindo no haversine`);
      }
    }

    if (!usedOrs) {
      console.log(`[roteirizar] Haversine fallback activated`);
      distanciaTotal = Math.round(twoOptDist * 10) / 10;
      estimado = true;

      const allFallbackPoints = [
        { cidade: oCidade, lat: originFallback.lat, lng: originFallback.lng },
        ...orderedGroups.map((g) => ({
          cidade: g.members[0]?.cidade ?? g.cityKey.split(",")[0],
          lat: g.lat,
          lng: g.lng,
        })),
      ];

      for (let i = 0; i < allFallbackPoints.length - 1; i++) {
        const from = allFallbackPoints[i];
        const to = allFallbackPoints[i + 1];
        const km = Math.round(haversine(from.lat, from.lng, to.lat, to.lng) * 10) / 10;
        trechos.push({ de: from.cidade, para: to.cidade, km, duracao: Math.round((km / 60) * 60) });
      }

      geometry = allFallbackPoints.map((p) => [p.lat, p.lng] as [number, number]);
      console.log(`[roteirizar] Haversine fallback: ${distanciaTotal}km, ${trechos.length} trechos`);
    }

    // ── EXPAND city groups back into individual destination items ──────────
    // Each group's members are assigned sequential ordem values.
    // Within the same city, preserve original input order.
    const ordemOtimizada: (GeocodedDestino & { ordem: number })[] = [];
    let ordemCounter = 1;
    for (const group of orderedGroups) {
      for (const member of group.members) {
        ordemOtimizada.push({ ...member, ordem: ordemCounter++ });
      }
    }

    console.log(`[roteirizar] Total time: ${Date.now() - t0}ms`);

    // ── PERSIST CACHE (fire-and-forget) ───────────────────────────────────
    if (vFast) {
      writeRouteCache(cacheKeyFast, `${oCidade},${oUf}`, destinos, vFast.distanciaTotal,
        vFast.duracaoMin, vFast.geometry, ordemOtimizada, "ors", vFast.pedagios)
        .catch((e) => console.warn(`[roteirizar] cache write FAST failed: ${e?.message}`));
    }
    if (vEcon) {
      writeRouteCache(cacheKeyEcon, `${oCidade},${oUf}`, destinos, vEcon.distanciaTotal,
        vEcon.duracaoMin, vEcon.geometry, ordemOtimizada, "ors", vEcon.pedagios)
        .catch((e) => console.warn(`[roteirizar] cache write ECON failed: ${e?.message}`));
    }

    return new Response(
      JSON.stringify({
        ordemOtimizada,
        geometria: geometry,
        distanciaTotal,
        trechos,
        pedagios,
        rotas: {
          rapida: vFast ? {
            ordemOtimizada,
            geometria: vFast.geometry,
            distanciaTotal: vFast.distanciaTotal,
            duracaoMin: vFast.duracaoMin,
            trechos: vFast.trechos,
            pedagios: vFast.pedagios,
          } : null,
          economica: vEcon ? {
            ordemOtimizada,
            geometria: vEcon.geometry,
            distanciaTotal: vEcon.distanciaTotal,
            duracaoMin: vEcon.duracaoMin,
            trechos: vEcon.trechos,
            pedagios: vEcon.pedagios,
          } : null,
        },
        estimado,
        origemLat: origemCoords?.lat ?? null,
        origemLng: origemCoords?.lng ?? null,
        origemCidadeNorm: oCidadeNorm,
        origemUfNorm: oUfNorm,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error(`[roteirizar] Unhandled error: ${(err as Error).message}`);
    // Last-resort: try stale cache if we have a key (timeout/provider failure)
    try {
      const body = await req.clone().json().catch(() => null);
      if (body?.destinos?.length) {
        const oCidade = body.origemCidade || "Goiânia";
        const oUf = body.origemUf || "GO";
        const preserveOrder = body?.preserveOrder === true;
        const cacheKey = await buildCacheKey(oCidade, oUf, body.destinos, preserveOrder, "fastest");
        const stale = await readRouteCacheStale(cacheKey);
        if (stale) {
          console.log(`[roteirizar] Returning STALE cache after error`);
          return new Response(
            JSON.stringify({
              ordemOtimizada: stale.ordem_otimizada || [],
              geometria: stale.geometry || [],
              distanciaTotal: stale.km_total ?? 0,
              trechos: [],
              estimado: true,
              fromCache: true,
              stale: true,
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    } catch { /* ignore */ }
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
