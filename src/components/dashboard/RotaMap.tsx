import { useEffect, useState, useRef } from "react";
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

const geocodeCache = new Map<string, Coords | null>();

async function geocode(cidade: string, uf: string): Promise<Coords | null> {
  const key = `${cidade},${uf}`;
  if (geocodeCache.has(key)) return geocodeCache.get(key)!;

  try {
    const q = encodeURIComponent(`${cidade}, ${uf}, Brasil`);
    const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1&countrycodes=br`, {
      headers: { "Accept-Language": "pt-BR" },
    });
    const data = await res.json();
    if (data.length > 0) {
      const coords = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
      geocodeCache.set(key, coords);
      return coords;
    }
  } catch {
    // ignore
  }
  geocodeCache.set(key, null);
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
    ">${num}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
}

function FitBounds({ points }: { points: Coords[] }) {
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
}

export function RotaMap({ destinos, routeGeometry, distanciaTotal, trechos, loading: externalLoading }: Props) {
  const [points, setPoints] = useState<(Coords & { ordem: number; cliente: string; cidade: string; uf: string })[]>([]);
  const [localLoading, setLocalLoading] = useState(false);
  const abortRef = useRef(0);

  const isLoading = externalLoading || localLoading;

  useEffect(() => {
    const run = ++abortRef.current;
    if (destinos.length === 0) {
      setPoints([]);
      return;
    }

    setLocalLoading(true);

    // FIX BUG 1: Geocode sequentially, then apply city offsets after all coords are resolved.
    // This prevents the race condition where parallel Promise.all causes cityCount to always read 0.
    (async () => {
      const resolved: ({ lat: number; lng: number; ordem: number; cliente: string; cidade: string; uf: string } | null)[] = [];

      // Phase 1: geocode all (may use cache or fetch)
      for (const d of destinos) {
        const coords = await geocode(d.cidade, d.uf);
        if (!coords) {
          resolved.push(null);
        } else {
          resolved.push({ lat: coords.lat, lng: coords.lng, ordem: d.ordem, cliente: d.cliente, cidade: d.cidade, uf: d.uf });
        }
      }

      if (run !== abortRef.current) return;

      // Phase 2: apply sequential offset for same-city markers
      const cityCount = new Map<string, number>();
      const result: (typeof resolved[0] & {})[] = [];
      for (const p of resolved) {
        if (!p) continue;
        const key = `${p.cidade},${p.uf}`;
        const count = cityCount.get(key) ?? 0;
        cityCount.set(key, count + 1);
        result.push({
          ...p,
          lat: p.lat + count * 0.003,
          lng: p.lng + count * 0.003,
        });
      }

      setPoints(result as any);
      setLocalLoading(false);
    })();
  }, [destinos]);

  const sortedPoints = [...points].sort((a, b) => a.ordem - b.ordem);

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
        <MapContainer
          center={[-15.78, -47.93]}
          zoom={4}
          className="h-[320px] w-full z-0"
          scrollWheelZoom={false}
          attributionControl={false}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <FitBounds points={sortedPoints} />
          {sortedPoints.map((p, idx) => {
            const type = idx === 0 ? "start" : idx === sortedPoints.length - 1 ? "end" : "middle";
            // FIX BUG 2: use stable unique key that reflects current order
            return (
              <Marker key={`marker-${p.cidade}-${p.uf}-${p.ordem}`} position={[p.lat, p.lng]} icon={createMarkerIcon(p.ordem, type)}>
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
