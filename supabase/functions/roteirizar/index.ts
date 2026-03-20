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

// Nominatim geocoding with retry
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

// Decode OSRM polyline (precision 5)
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

    // Geocode all destinations
    const geocoded: GeocodedDestino[] = [];
    for (let i = 0; i < destinos.length; i++) {
      const d = destinos[i];
      let lat = d.lat;
      let lng = d.lng;
      if (!lat || !lng) {
        const coords = await geocode(d.cidade, d.uf);
        if (!coords) continue;
        lat = coords.lat;
        lng = coords.lng;
      }
      geocoded.push({ ...d, lat, lng, originalIndex: i });
    }

    if (geocoded.length < 2) {
      // Not enough points for routing, return as-is
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

    // Apply small offset for same-city destinations
    const cityCount = new Map<string, number>();
    for (const g of geocoded) {
      const key = `${g.cidade}-${g.uf}`;
      const count = cityCount.get(key) ?? 0;
      if (count > 0) {
        // Apply small offset to avoid overlap
        g.lat += count * 0.003;
        g.lng += count * 0.003;
      }
      cityCount.set(key, count + 1);
    }

    // Build coordinates string for OSRM trip endpoint
    const coordsStr = geocoded.map((g) => `${g.lng},${g.lat}`).join(";");

    // Use OSRM trip (TSP) endpoint
    const osrmUrl = `https://router.project-osrm.org/trip/v1/driving/${coordsStr}?roundtrip=false&source=first&destination=last&geometries=polyline&overview=full&steps=false`;

    const osrmRes = await fetch(osrmUrl);
    const osrmData = await osrmRes.json();

    if (osrmData.code !== "Ok" || !osrmData.trips || osrmData.trips.length === 0) {
      // Fallback: use route endpoint instead of trip (non-optimized)
      const routeUrl = `https://router.project-osrm.org/route/v1/driving/${coordsStr}?geometries=polyline&overview=full&steps=false`;
      const routeRes = await fetch(routeUrl);
      const routeData = await routeRes.json();

      if (routeData.code !== "Ok" || !routeData.routes || routeData.routes.length === 0) {
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

      const route = routeData.routes[0];
      const geometry = decodePolyline(route.geometry);
      const distanciaTotal = Math.round(route.distance / 1000 * 10) / 10;

      // Build trechos from legs
      const trechos = (route.legs || []).map((leg: any, i: number) => ({
        de: geocoded[i]?.cliente ?? "",
        para: geocoded[i + 1]?.cliente ?? "",
        km: Math.round(leg.distance / 1000 * 10) / 10,
        duracao: Math.round(leg.duration / 60),
      }));

      return new Response(
        JSON.stringify({
          ordemOtimizada: geocoded.map((g, i) => ({ ...g, ordem: i + 1 })),
          geometria: geometry,
          distanciaTotal,
          trechos,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const trip = osrmData.trips[0];
    const waypoints = osrmData.waypoints;
    const geometry = decodePolyline(trip.geometry);
    const distanciaTotal = Math.round(trip.distance / 1000 * 10) / 10;

    // Reorder geocoded based on waypoint_index
    const reordered = waypoints
      .map((wp: any) => ({
        ...geocoded[wp.waypoint_index],
        ordem: wp.trips_index !== undefined ? wp.waypoint_index + 1 : wp.waypoint_index + 1,
      }))
      .sort((a: any, b: any) => {
        const aIdx = waypoints.findIndex((w: any) => geocoded[w.waypoint_index] === geocoded[waypoints.indexOf(a)]);
        return 0;
      });

    // Actually build order from waypoints
    const orderedDestinos = waypoints.map((wp: any, idx: number) => ({
      ...geocoded[wp.waypoint_index],
      ordem: idx + 1,
    }));

    // Build trechos from legs
    const trechos = (trip.legs || []).map((leg: any, i: number) => ({
      de: orderedDestinos[i]?.cliente ?? "",
      para: orderedDestinos[i + 1]?.cliente ?? "",
      km: Math.round(leg.distance / 1000 * 10) / 10,
      duracao: Math.round(leg.duration / 60),
    }));

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
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
