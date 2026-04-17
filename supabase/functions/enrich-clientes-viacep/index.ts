import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const CHUNK = 300; // CEPs únicos processados por chamada

function normalizeCep(v: any): string {
  return String(v ?? "").replace(/\D/g, "").slice(0, 8);
}

async function fetchViaCep(cep: string) {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 4000);
    const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`, { signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.erro) return null;
    return data as { localidade?: string; uf?: string };
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let body: any = {};
    try { body = await req.json(); } catch {}
    const cursor: string | null = body?.cursor ?? null; // último CEP processado

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Buscar próximos clientes com CEP, ordenados por CEP, após o cursor
    // Pegamos um excedente para garantir CHUNK CEPs únicos válidos
    let query = admin
      .from("clientes")
      .select("id, cep, cidade, uf")
      .not("cep", "is", null)
      .order("cep", { ascending: true })
      .limit(CHUNK * 5);
    if (cursor) query = query.gt("cep", cursor);

    const { data: rows, error } = await query;
    if (error) throw error;

    const clientes = (rows || []).map((r: any) => ({
      ...r,
      cepNorm: normalizeCep(r.cep),
    })).filter((r: any) => /^\d{8}$/.test(r.cepNorm));

    if (clientes.length === 0) {
      return new Response(JSON.stringify({ done: true, updated: 0, processed: 0, next_cursor: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // CEPs únicos limitados a CHUNK
    const uniqueCeps: string[] = [];
    const seen = new Set<string>();
    for (const c of clientes) {
      if (!seen.has(c.cepNorm)) { seen.add(c.cepNorm); uniqueCeps.push(c.cepNorm); }
      if (uniqueCeps.length >= CHUNK) break;
    }
    const lastCep = uniqueCeps[uniqueCeps.length - 1];

    // Filtrar clientes deste lote (cep <= lastCep)
    const lote = clientes.filter((c: any) => c.cepNorm <= lastCep);

    // Resolver CEPs em paralelo (concurrency limitada)
    const cepMap = new Map<string, { cidade: string; uf: string }>();
    let i = 0;
    const concurrency = 20;
    async function worker() {
      while (i < uniqueCeps.length) {
        const idx = i++;
        const cep = uniqueCeps[idx];
        const data = await fetchViaCep(cep);
        if (data?.localidade && data?.uf) cepMap.set(cep, { cidade: data.localidade, uf: data.uf });
      }
    }
    await Promise.all(Array.from({ length: concurrency }, () => worker()));

    // Aplicar updates
    let updated = 0;
    const updates = lote
      .map((c: any) => {
        const info = cepMap.get(c.cepNorm);
        if (!info) return null;
        if (c.cidade === info.cidade && c.uf === info.uf) return null;
        return { id: c.id, cidade: info.cidade, uf: info.uf };
      })
      .filter(Boolean) as { id: string; cidade: string; uf: string }[];

    for (let k = 0; k < updates.length; k += 50) {
      const batch = updates.slice(k, k + 50);
      await Promise.all(batch.map(async (u) => {
        const { error } = await admin.from("clientes").update({ cidade: u.cidade, uf: u.uf }).eq("id", u.id);
        if (!error) updated++;
      }));
    }

    return new Response(JSON.stringify({
      done: false,
      processed: lote.length,
      unique_ceps: uniqueCeps.length,
      viacep_resolved: cepMap.size,
      updated,
      next_cursor: lastCep,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
