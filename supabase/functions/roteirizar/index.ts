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
        g.lat += count * 0.003;
        g.lng += count * 0.003;
      }
      cityCount.set(key, count + 1);
    }

    // Build waypoints: origin first (if available), then destinations
    const hasOrigin = !!origemCoords;
    const allPoints = hasOrigin
      ? [origemCoords!, ...geocoded.map((g) => ({ lat: g.lat, lng: g.lng }))]
      : geocoded.map((g) => ({ lat: g.lat, lng: g.lng }));

    const coordsStr = allPoints.map((p) => `${p.lng},${p.lat}`).join(";");

    // Use OSRM trip (TSP) with source=first so route starts from origin
    const osrmUrl = `https://router.project-osrm.org/trip/v1/driving/${coordsStr}?roundtrip=false&source=first&destination=last&geometries=polyline&overview=full&steps=false`;

    const osrmRes = await fetch(osrmUrl);
    const osrmData = await osrmRes.json();

    if (osrmData.code !== "Ok" || !osrmData.trips || osrmData.trips.length === 0) {
      // Fallback: route endpoint (non-optimized)
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
      const distanciaTotal = Math.round((route.distance / 1000) * 10) / 10;

      // Build trechos, skipping origin leg
      const legs = route.legs || [];
      const startLeg = hasOrigin ? 1 : 0;
      const trechos = [];
      for (let i = startLeg; i < legs.length; i++) {
        const fromIdx = hasOrigin ? i - 1 : i;
        const toIdx = hasOrigin ? i : i + 1;
        trechos.push({
          de: geocoded[fromIdx]?.cliente ?? (i === startLeg && hasOrigin ? oCidade : ""),
          para: geocoded[toIdx]?.cliente ?? "",
          km: Math.round((legs[i].distance / 1000) * 10) / 10,
          duracao: Math.round(legs[i].duration / 60),
        });
      }

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
    const distanciaTotal = Math.round((trip.distance / 1000) * 10) / 10;

    // Build ordered destinations from waypoints, excluding origin (index 0 if hasOrigin)
    const originWpIdx = hasOrigin ? 0 : -1;
    const destWaypoints = waypoints
      .filter((_: any, idx: number) => idx !== originWpIdx || !hasOrigin)
      .sort((a: any, b: any) => {
        // Sort by the order OSRM placed them in the trip
        const aPos = waypoints.indexOf(a);
        const bPos = waypoints.indexOf(b);
        return aPos - bPos;
      });

    // Map waypoint_index back to geocoded destinations (offset by 1 if origin present)
    const orderedDestinos = destWaypoints.map((wp: any, idx: number) => {
      const geoIdx = hasOrigin ? wp.waypoint_index - 1 : wp.waypoint_index;
      return {
        ...geocoded[geoIdx],
        ordem: idx + 1,
      };
    }).filter((d: any) => d.cidade); // filter out any undefined from bad mapping

    // Build trechos from legs, skipping origin->first leg label
    const trechos = (trip.legs || []).map((leg: any, i: number) => {
      // For labeling: all waypoints in trip order
      const allWpOrdered = waypoints.slice().sort((a: any, b: any) => {
        const aI = waypoints.indexOf(a);
        const bI = waypoints.indexOf(b);
        return aI - bI;
      });
      const fromWp = allWpOrdered[i];
      const toWp = allWpOrdered[i + 1];
      const fromGeoIdx = hasOrigin ? fromWp.waypoint_index - 1 : fromWp.waypoint_index;
      const toGeoIdx = hasOrigin ? toWp.waypoint_index - 1 : toWp.waypoint_index;

      return {
        de: fromGeoIdx < 0 ? oCidade : (geocoded[fromGeoIdx]?.cliente ?? ""),
        para: toGeoIdx < 0 ? oCidade : (geocoded[toGeoIdx]?.cliente ?? ""),
        km: Math.round((leg.distance / 1000) * 10) / 10,
        duracao: Math.round(leg.duration / 60),
      };
    });

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
