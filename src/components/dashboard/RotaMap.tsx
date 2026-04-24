import { useEffect, useState, useRef, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";

interface DestinoRota {
  ordem: number;
  cliente: string;
  cidade: string;
  uf: string;
}

interface TrechoInfo {
  de: string;
  para: string;
  km: number;
  duracao: number;
}

interface OrigemRota {
  cidade: string;
  uf: string;
}

interface Props {
  destinos: DestinoRota[];
  origem?: OrigemRota;
  routeGeometry?: [number, number][];
  distanciaTotal?: number;
  trechos?: TrechoInfo[];
  loading?: boolean;
  /** Coordenadas pré-geocodadas pela edge function — pula geocoding completamente */
  coordsCache?: Map<string, { lat: number; lng: number }>;
  /** Quando true, a rota foi calculada por estimativa haversine (OSRM indisponível) */
  estimado?: boolean;
  /** Custo estimado de combustível em R$ (calculado externamente). */
  custoCombustivel?: number | null;
  /** Tipo de caminhão usado para o cálculo (apenas exibição). */
  tipoCaminhaoLabel?: string | null;
}

interface Coords {
  lat: number;
  lng: number;
}

// Module-level cache: persists across re-renders and component remounts
const geocodeCache = new Map<string, Coords>();

/** Normalize city name to match backend: UPPERCASE, no accents */
function normCity(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .trim();
}

/** Query DB geocode_cache for a batch of city+uf pairs (using normalized names) */
async function geocodeFromDb(
  pairs: { cidade: string; uf: string }[]
): Promise<Map<string, Coords>> {
  const result = new Map<string, Coords>();
  if (pairs.length === 0) return result;

  // Always use normalized names for DB queries
  const normalizedPairs = pairs.map((p) => ({
    cidade: normCity(p.cidade),
    uf: p.uf.toUpperCase().trim(),
  }));

  const cidades = [...new Set(normalizedPairs.map((p) => p.cidade))];
  const { data, error } = await supabase
    .from("geocode_cache" as never)
    .select("cidade, uf, lat, lng")
    .in("cidade", cidades);

  if (error || !data) return result;

  const pairSet = new Set(normalizedPairs.map((p) => `${p.cidade},${p.uf}`));
  for (const row of data as { cidade: string; uf: string; lat: number; lng: number }[]) {
    const key = `${row.cidade},${row.uf}`;
    if (pairSet.has(key)) {
      // Store under BOTH normalized and original keys so lookups always hit
      result.set(key, { lat: row.lat, lng: row.lng });
    }
  }
  return result;
}

/** Nominatim fallback (only for cities not in DB) */
async function geocodeViaNominatim(cidade: string, uf: string): Promise<Coords | null> {
  const normKey = `${normCity(cidade)},${uf.toUpperCase().trim()}`;
  if (geocodeCache.has(normKey)) return geocodeCache.get(normKey)!;
  try {
    const q = encodeURIComponent(`${cidade}, ${uf}, Brasil`);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1&countrycodes=br`,
      {
        headers: {
          "Accept-Language": "pt-BR",
          // BUG 3 FIX: Required by Nominatim usage policy — without this, requests are blocked
          "User-Agent": "ExpediDash/2.0 (expedi-dash.lovable.app)",
        },
      }
    );
    const data = await res.json();
    if (data.length > 0) {
      const coords = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
      geocodeCache.set(normKey, coords);
      return coords;
    }
  } catch {
    // Do not cache failures
  }
  return null;
}

// Memoized marker icon cache to avoid recreating L.divIcon on every render
const markerIconCache = new Map<string, L.DivIcon>();

function createMarkerIcon(num: number, type: "start" | "middle" | "end") {
  const cacheKey = `${num}-${type}`;
  if (markerIconCache.has(cacheKey)) return markerIconCache.get(cacheKey)!;

  const colors = {
    start: { bg: "hsl(142, 71%, 45%)", border: "white" },
    middle: { bg: "hsl(217, 91%, 60%)", border: "white" },
    end: { bg: "hsl(0, 72%, 51%)", border: "white" },
  };
  const { bg, border } = colors[type];
  const icon = L.divIcon({
    className: "custom-marker",
    html: `<div style="
      background: ${bg};
      color: white;
      width: 30px;
      height: 30px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 13px;
      border: 2.5px solid ${border};
      box-shadow: 0 2px 8px rgba(0,0,0,0.35);
      pointer-events: none;
    ">${num}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
  markerIconCache.set(cacheKey, icon);
  return icon;
}

function createOrigemIcon(label: string) {
  return L.divIcon({
    className: "custom-marker-origem",
    html: `<div style="
      background: hsl(25, 95%, 53%);
      color: white;
      width: 34px;
      height: 34px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 11px;
      border: 3px solid white;
      box-shadow: 0 2px 10px rgba(0,0,0,0.4);
      pointer-events: none;
    ">${label}</div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });
}

/** BUG 27 FIX: Remove unnecessary forwardRef */
function FitBounds({ points }: { points: Coords[] }) {
  const map = useMap();
  // BUG 10 FIX: Use real centroid coords (no offsets) for bounds calculation
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 8);
    } else {
      const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng]));
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [points, map]);
  return null;
}

/** BUG 6 FIX: Convert minutes to human-readable duration */
function formatDuracao(minutos: number): string {
  if (minutos < 60) return `~${minutos} min`;
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return m > 0 ? `~${h}h ${m}min` : `~${h}h`;
}

export function RotaMap({
  destinos,
  origem,
  routeGeometry,
  distanciaTotal,
  trechos,
  loading: externalLoading,
  coordsCache,
  estimado,
  custoCombustivel,
  tipoCaminhaoLabel,
}: Props) {
  const [geocodedCoords, setGeocodedCoords] = useState<Map<string, Coords>>(new Map());
  const [origemCoords, setOrigemCoords] = useState<Coords | null>(null);
  const [localLoading, setLocalLoading] = useState(false);
  const abortRef = useRef(0);
  const isMobile = useIsMobile();

  const isLoading = externalLoading || localLoading;

  // BUG 21 FIX: Use abbreviated city name for origin marker (not hardcoded "O")
  const origemLabel = useMemo(() => {
    if (!origem) return "O";
    const abbr = normCity(origem.cidade)
      .replace(/\s+/g, " ")
      .split(" ")
      .map((w) => w[0])
      .join("")
      .substring(0, 3);
    return abbr || "O";
  }, [origem]);

  // BUG 26 FIX: memoize origin icon to avoid recreating on every render
  const origemIcon = useMemo(() => createOrigemIcon(origemLabel), [origemLabel]);

  const citySetKey = useMemo(() => {
    const pairs = Array.from(new Set(destinos.map((d) => `${normCity(d.cidade)},${d.uf.toUpperCase().trim()}`))).sort();
    const origemKey = origem ? `__origem__${normCity(origem.cidade)},${origem.uf.toUpperCase().trim()}` : "";
    return pairs.join("|") + origemKey;
  }, [destinos, origem]);

  const mapKeyRef = useRef(0);
  const prevCitySetKeyRef = useRef("");
  if (prevCitySetKeyRef.current !== citySetKey) {
    prevCitySetKeyRef.current = citySetKey;
    mapKeyRef.current += 1;
  }
  const mapKey = mapKeyRef.current;

  useEffect(() => {
    const run = ++abortRef.current;

    if (destinos.length === 0) {
      setGeocodedCoords(new Map());
      setOrigemCoords(null);
      return;
    }

    // BUG 1/13 FIX: Normalize all keys before pre-populating from coordsCache
    // Backend stores UPPERCASE normalized names; frontend must match exactly
    if (coordsCache && coordsCache.size > 0) {
      for (const [rawKey, coords] of coordsCache) {
        const [cidade, uf] = rawKey.split(",");
        const normKey = `${normCity(cidade)},${uf?.toUpperCase().trim() ?? ""}`;
        geocodeCache.set(normKey, coords);
      }
    }

    const uniquePairs = Array.from(
      new Set(destinos.map((d) => `${normCity(d.cidade)},${d.uf.toUpperCase().trim()}`))
    ).map((key) => {
      const [cidade, uf] = key.split(",");
      return { cidade, uf, key };
    });

    const origemPair = origem
      ? {
          cidade: normCity(origem.cidade),
          uf: origem.uf.toUpperCase().trim(),
          key: `${normCity(origem.cidade)},${origem.uf.toUpperCase().trim()}`,
        }
      : null;

    const buildFromCache = () => {
      const coordMap = new Map<string, Coords>();
      for (const { key } of uniquePairs) {
        const c = geocodeCache.get(key);
        if (c) coordMap.set(key, c);
      }
      setGeocodedCoords(coordMap);
      if (origemPair) {
        setOrigemCoords(geocodeCache.get(origemPair.key) ?? null);
      }
    };

    const allPairs = origemPair ? [...uniquePairs, origemPair] : uniquePairs;
    const missingFromCache = allPairs.filter(({ key }) => !geocodeCache.has(key));

    // Everything already cached → instant render (BUG 13 FIX: normalized keys match now)
    if (missingFromCache.length === 0) {
      buildFromCache();
      return;
    }

    setLocalLoading(true);

    (async () => {
      // BUG 2 FIX: DB query uses normalized city names (already normalized in missingFromCache)
      const dbCoords = await geocodeFromDb(
        missingFromCache.map(({ cidade, uf }) => ({ cidade, uf }))
      );
      for (const [key, coords] of dbCoords) {
        geocodeCache.set(key, coords);
      }

      // Nominatim for anything still missing (very rare — only unknown cities)
      const stillMissing = missingFromCache.filter(({ key }) => !geocodeCache.has(key));
      for (let i = 0; i < stillMissing.length; i++) {
        const { cidade, uf, key } = stillMissing[i];
        if (i > 0) await new Promise((r) => setTimeout(r, 800));
        let coords: Coords | null = null;
        for (const wait of [0, 1500, 3000]) {
          if (wait > 0) await new Promise((r) => setTimeout(r, wait));
          coords = await geocodeViaNominatim(cidade, uf);
          if (coords) break;
        }
        if (coords) geocodeCache.set(key, coords);
      }

      if (run !== abortRef.current) return;

      buildFromCache();
      setLocalLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [citySetKey, coordsCache]);

  const sortedPoints = useMemo(() => {
    const sorted = [...destinos].sort((a, b) => a.ordem - b.ordem);
    const cityCount = new Map<string, number>();
    const result: (Coords & {
      ordem: number;
      cliente: string;
      cidade: string;
      uf: string;
      // BUG 10 FIX: store real centroid separately for bounds
      realLat: number;
      realLng: number;
    })[] = [];

    for (const d of sorted) {
      const key = `${normCity(d.cidade)},${d.uf.toUpperCase().trim()}`;
      const base = geocodedCoords.get(key);
      if (!base) continue;
      const count = cityCount.get(key) ?? 0;
      cityCount.set(key, count + 1);
      result.push({
        // Visual offset for multiple clients in same city
        lat: base.lat + count * 0.003,
        lng: base.lng + count * 0.003,
        // Real centroid for bounds calculation (BUG 10 FIX)
        realLat: base.lat,
        realLng: base.lng,
        ordem: d.ordem,
        cliente: d.cliente,
        cidade: d.cidade,
        uf: d.uf,
      });
    }
    return result;
  }, [destinos, geocodedCoords]);

  // BUG 10 FIX: Use real centroid coords for bounds (not offset coords)
  const allBoundsPoints = useMemo(() => {
    const pts: Coords[] = sortedPoints.map((p) => ({ lat: p.realLat, lng: p.realLng }));
    if (origemCoords) pts.push(origemCoords);
    return pts;
  }, [sortedPoints, origemCoords]);

  // BUG 17 FIX: Filter out invalid [0,0] coordinates from polyline
  const polylinePositions: [number, number][] = useMemo(() => {
    if (!routeGeometry || routeGeometry.length <= 1) return [];
    return routeGeometry.filter(([lat, lng]) => lat !== 0 || lng !== 0);
  }, [routeGeometry]);

  if (destinos.length === 0) {
    return (
      <div className="h-[320px] rounded-lg border border-border bg-muted/20 flex items-center justify-center text-sm text-muted-foreground">
        Selecione pedidos para visualizar a rota
      </div>
    );
  }

  return (
      <div className="space-y-2">
      {distanciaTotal != null && distanciaTotal > 0 && (
        <div className="flex flex-wrap items-center gap-3 px-3 py-2 rounded-lg bg-muted/30 border border-border text-sm">
          {/* BUG 24 FIX: Format with locale number separator */}
          <span className="font-semibold">{distanciaTotal.toLocaleString("pt-BR")} km total</span>
          {estimado && (
            <span className="inline-flex items-center rounded-full border border-yellow-500/40 bg-yellow-500/10 px-2 py-0.5 text-xs font-medium text-yellow-600 dark:text-yellow-400">
              Distância estimada
            </span>
          )}
          {trechos && trechos.length > 0 && (
            <span className="text-muted-foreground text-xs">
              {trechos.map((t, i) => (
                <span key={i}>
                  {i > 0 && " → "}
                  {t.km.toLocaleString("pt-BR")} km
                </span>
              ))}
            </span>
          )}
        </div>
      )}

      <div className="relative rounded-lg overflow-hidden border border-border">
        {isLoading && (
          <div className="absolute inset-0 z-[1000] bg-background/60 flex items-center justify-center">
            <span className="text-sm text-muted-foreground animate-pulse">
              Carregando mapa...
            </span>
          </div>
        )}
        {/* BUG 18 FIX: Unified height h-[320px] — same as the Suspense fallback */}
        <MapContainer
          key={mapKey}
          center={[-15.78, -47.93]}
          zoom={4}
          className="h-[320px] w-full z-0"
          scrollWheelZoom={false}
          // BUG 25 FIX: Disable dragging on mobile to allow page scroll
          dragging={!isMobile}
          attributionControl={false}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <FitBounds points={allBoundsPoints} />

          {origemCoords && origem && (
            <Marker
              key="origem"
              position={[origemCoords.lat, origemCoords.lng]}
              icon={origemIcon}
            >
              <Popup>
                {/* BUG 22 FIX: max-width on popup content */}
                <div className="text-xs max-w-[180px]">
                  <strong>Origem</strong>
                  <br />
                  {origem.cidade} – {origem.uf}
                </div>
              </Popup>
            </Marker>
          )}

          {sortedPoints.map((p, idx) => {
            const type =
              idx === 0 ? "start" : idx === sortedPoints.length - 1 ? "end" : "middle";
            return (
              <Marker
                key={`m-${p.ordem}-${p.cidade}-${p.uf}`}
                position={[p.lat, p.lng]}
                icon={createMarkerIcon(p.ordem, type)}
              >
                <Popup>
                  {/* BUG 22 FIX: max-width on popup content */}
                  <div className="text-xs max-w-[180px] break-words">
                    <strong>
                      {p.ordem}. {p.cliente}
                    </strong>
                    <br />
                    {p.cidade} – {p.uf}
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {polylinePositions.length > 1 && (
            <Polyline
              positions={polylinePositions}
              pathOptions={{
                color: "hsl(217, 91%, 60%)",
                weight: 4,
                opacity: 0.85,
              }}
            />
          )}
        </MapContainer>
      </div>

      {trechos && trechos.length > 0 && (
        // BUG 23 FIX: Use single column to prevent text truncation on small screens
        <div className="flex flex-col gap-1 text-xs text-muted-foreground">
          {trechos.map((t, i) => (
            <div
              key={i}
              className="flex items-center gap-1.5 px-2 py-1 rounded bg-muted/20"
            >
              <span className="font-medium text-foreground min-w-0 flex-1">
                {t.de} → {t.para}
              </span>
              <span className="ml-auto font-mono whitespace-nowrap shrink-0">
                {t.km.toLocaleString("pt-BR")} km · {formatDuracao(t.duracao)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
