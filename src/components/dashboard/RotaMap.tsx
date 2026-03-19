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

interface Props {
  destinos: DestinoRota[];
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

function createNumberedIcon(num: number) {
  return L.divIcon({
    className: "custom-marker",
    html: `<div style="
      background: hsl(var(--primary));
      color: hsl(var(--primary-foreground));
      width: 28px;
      height: 28px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 13px;
      border: 2px solid white;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    ">${num}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
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

export function RotaMap({ destinos }: Props) {
  const [points, setPoints] = useState<(Coords & { ordem: number; cliente: string; cidade: string; uf: string })[]>([]);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef(0);

  useEffect(() => {
    const run = ++abortRef.current;
    if (destinos.length === 0) {
      setPoints([]);
      return;
    }

    setLoading(true);

    // Deduplicate by cidade+uf, keeping first occurrence info
    const unique = new Map<string, DestinoRota>();
    destinos.forEach((d) => {
      const k = `${d.cidade},${d.uf}`;
      if (!unique.has(k)) unique.set(k, d);
    });

    Promise.all(
      Array.from(unique.values()).map(async (d) => {
        const coords = await geocode(d.cidade, d.uf);
        if (!coords) return null;
        return { ...coords, ordem: d.ordem, cliente: d.cliente, cidade: d.cidade, uf: d.uf };
      })
    ).then((results) => {
      if (run !== abortRef.current) return;
      setPoints(results.filter(Boolean) as any);
      setLoading(false);
    });
  }, [destinos]);

  const polylinePositions = points
    .sort((a, b) => a.ordem - b.ordem)
    .map((p) => [p.lat, p.lng] as [number, number]);

  if (destinos.length === 0) {
    return (
      <div className="h-[280px] rounded-lg border border-border bg-muted/20 flex items-center justify-center text-sm text-muted-foreground">
        Selecione pedidos para visualizar a rota
      </div>
    );
  }

  return (
    <div className="relative rounded-lg overflow-hidden border border-border">
      {loading && (
        <div className="absolute inset-0 z-[1000] bg-background/60 flex items-center justify-center">
          <span className="text-sm text-muted-foreground animate-pulse">Carregando mapa...</span>
        </div>
      )}
      <MapContainer
        center={[-15.78, -47.93]}
        zoom={4}
        className="h-[280px] w-full z-0"
        scrollWheelZoom={false}
        attributionControl={false}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <FitBounds points={points} />
        {points.map((p) => (
          <Marker key={`${p.cidade}-${p.uf}`} position={[p.lat, p.lng]} icon={createNumberedIcon(p.ordem)}>
            <Popup>
              <strong>{p.cliente}</strong>
              <br />
              {p.cidade} – {p.uf}
            </Popup>
          </Marker>
        ))}
        {polylinePositions.length > 1 && (
          <Polyline positions={polylinePositions} pathOptions={{ color: "hsl(var(--primary))", weight: 3, dashArray: "8 4" }} />
        )}
      </MapContainer>
    </div>
  );
}
