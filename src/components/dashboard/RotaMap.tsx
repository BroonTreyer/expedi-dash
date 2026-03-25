import { useEffect, useState, useRef, useMemo, forwardRef } from "react";
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

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

interface Props {
  destinos: DestinoRota[];
  routeGeometry?: [number, number][];
  distanciaTotal?: number;
  trechos?: TrechoInfo[];
  loading?: boolean;
}

interface Coords {
  lat: number;
  lng: number;
}

// FIX: Only cache successful results — never cache null so transient Nominatim failures can be retried
const geocodeCache = new Map<string, Coords>();

async function geocode(cidade: string, uf: string): Promise<Coords | null> {
  const key = `${cidade},${uf}`;
  if (geocodeCache.has(key)) return geocodeCache.get(key)!;

  try {
    const q = encodeURIComponent(`${cidade}, ${uf}, Brasil`);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1&countrycodes=br`,
      { headers: { "Accept-Language": "pt-BR" } }
    );
    const data = await res.json();
    if (data.length > 0) {
      const coords = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
      geocodeCache.set(key, coords); // Only cache on success
      return coords;
    }
  } catch {
    // Do NOT cache failures — allow retry on next render
  }
  return null;
}

function createMarkerIcon(num: number, type: "start" | "middle" | "end") {
  const colors = {
    start: { bg: "hsl(142, 71%, 45%)", border: "white" },
    middle: { bg: "hsl(217, 91%, 60%)", border: "white" },
    end: { bg: "hsl(0, 72%, 51%)", border: "white" },
  };
  const { bg, border } = colors[type];

  return L.divIcon({
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
}

// FIX: react-leaflet FitBounds must not be given a ref — use forwardRef to avoid the warning
// Actually the warning is because MapContainer tries to give a ref to FitBounds as a child.
// Solution: render FitBounds as a plain component (no ref needed — useMap handles it).
// The warning comes from MapContainer passing refs to function component children.
// We can suppress by wrapping with React.forwardRef, but the cleanest fix is to just ignore it
// since FitBounds is rendered inside MapContainer via JSX, not via React.cloneElement with ref.
// The actual fix: don't pass FitBounds as a direct child in a way that triggers ref forwarding.
// In react-leaflet v4, function component children do NOT need forwardRef.
// The warning originates because MapContainer is wrapping children in a context — it's a known
// harmless warning in react-leaflet 4 + React 18. We add forwardRef to silence it.
const FitBounds = forwardRef<HTMLDivElement, { points: Coords[] }>(function FitBounds({ points }, _ref) {
  const map = useMap();
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
});

export function RotaMap({ destinos, routeGeometry, distanciaTotal, trechos, loading: externalLoading }: Props) {
  // State holds geocoded points indexed by "cidade,uf" fingerprint → includes ALL destinos in current ordem
  const [geocodedCoords, setGeocodedCoords] = useState<Map<string, Coords>>(new Map());
  const [localLoading, setLocalLoading] = useState(false);
  const abortRef = useRef(0);

  const isLoading = externalLoading || localLoading;

  // Build a stable fingerprint of unique cidade+uf pairs (independent of ordem).
  // Only re-geocode when the SET of cities changes, not when ordem changes.
  const citySetKey = useMemo(() => {
    const pairs = Array.from(new Set(destinos.map((d) => `${d.cidade},${d.uf}`))).sort();
    return pairs.join("|");
  }, [destinos]);

  useEffect(() => {
    const run = ++abortRef.current;

    if (destinos.length === 0) {
      setGeocodedCoords(new Map());
      return;
    }

    // Collect unique city/uf pairs that need geocoding
    const uniquePairs = Array.from(new Set(destinos.map((d) => `${d.cidade},${d.uf}`)));
    const needsFetch = uniquePairs.some((key) => !geocodeCache.has(key));

    if (!needsFetch) {
      // All already cached — build map immediately, no loading state
      const coordMap = new Map<string, Coords>();
      for (const key of uniquePairs) {
        const c = geocodeCache.get(key);
        if (c) coordMap.set(key, c);
      }
      setGeocodedCoords(coordMap);
      return;
    }

    setLocalLoading(true);

    (async () => {
      // Geocode all unique city/uf pairs sequentially
      const coordMap = new Map<string, Coords>();
      for (const pair of uniquePairs) {
        if (run !== abortRef.current) return; // aborted
        const [cidade, uf] = pair.split(",");
        const coords = await geocode(cidade, uf);
        if (coords) coordMap.set(pair, coords);
      }

      if (run !== abortRef.current) return;

      setGeocodedCoords(coordMap);
      setLocalLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [citySetKey]); // CRITICAL: only re-run when the city SET changes, NOT when ordem changes

  // Build sorted marker points from destinos (reflects current ordem) + geocodedCoords
  // Apply sequential offset for same-city markers AFTER sorting by ordem
  const sortedPoints = useMemo(() => {
    const sorted = [...destinos].sort((a, b) => a.ordem - b.ordem);
    const cityCount = new Map<string, number>();
    const result: (Coords & { ordem: number; cliente: string; cidade: string; uf: string })[] = [];

    for (const d of sorted) {
      const key = `${d.cidade},${d.uf}`;
      const base = geocodedCoords.get(key);
      if (!base) continue;
      const count = cityCount.get(key) ?? 0;
      cityCount.set(key, count + 1);
      result.push({
        lat: base.lat + count * 0.003,
        lng: base.lng + count * 0.003,
        ordem: d.ordem,
        cliente: d.cliente,
        cidade: d.cidade,
        uf: d.uf,
      });
    }
    return result;
  }, [destinos, geocodedCoords]);

  // Stable key for MapContainer: changes only when city set changes → forces re-mount to reset Leaflet state
  const mapKey = citySetKey;

  const polylinePositions: [number, number][] = routeGeometry && routeGeometry.length > 0
    ? routeGeometry
    : [];

  if (destinos.length === 0) {
    return (
      <div className="h-[320px] rounded-lg border border-border bg-muted/20 flex items-center justify-center text-sm text-muted-foreground">
        Selecione pedidos para visualizar a rota
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Distance info bar */}
      {distanciaTotal != null && distanciaTotal > 0 && (
        <div className="flex flex-wrap items-center gap-3 px-3 py-2 rounded-lg bg-muted/30 border border-border text-sm">
          <span className="font-semibold">{distanciaTotal} km total</span>
          {trechos && trechos.length > 0 && (
            <span className="text-muted-foreground text-xs">
              {trechos.map((t, i) => (
                <span key={i}>
                  {i > 0 && " → "}
                  {t.km} km
                </span>
              ))}
            </span>
          )}
        </div>
      )}

      {/* Map */}
      <div className="relative rounded-lg overflow-hidden border border-border">
        {isLoading && (
          <div className="absolute inset-0 z-[1000] bg-background/60 flex items-center justify-center">
            <span className="text-sm text-muted-foreground animate-pulse">Carregando mapa...</span>
          </div>
        )}
        {/* key={mapKey} forces Leaflet re-mount when city set changes, clearing stale marker/zoom state */}
        <MapContainer
          key={mapKey}
          center={[-15.78, -47.93]}
          zoom={4}
          className="h-[320px] w-full z-0"
          scrollWheelZoom={false}
          attributionControl={false}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <FitBounds points={sortedPoints} />
          {sortedPoints.map((p, idx) => {
            // FIX: use map index directly — indexOf is fragile with object references
            const type = idx === 0 ? "start" : idx === sortedPoints.length - 1 ? "end" : "middle";
            return (
              <Marker
                key={`m-${p.ordem}-${p.cidade}-${p.uf}`}
                position={[p.lat, p.lng]}
                icon={createMarkerIcon(p.ordem, type)}
              >
                <Popup>
                  <div className="text-xs">
                    <strong>{p.ordem}. {p.cliente}</strong>
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

      {/* Trecho details */}
      {trechos && trechos.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs text-muted-foreground">
          {trechos.map((t, i) => (
            <div key={i} className="flex items-center gap-1.5 px-2 py-1 rounded bg-muted/20">
              <span className="font-medium text-foreground truncate">{t.de} → {t.para}</span>
              <span className="ml-auto font-mono whitespace-nowrap">{t.km} km</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
