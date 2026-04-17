import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const CHUNK = 600;
const CONCURRENCY = 25;
const FETCH_TIMEOUT_MS = 6000;

function normalizeCep(v: any): string {
  return String(v ?? "").replace(/\D/g, "").slice(0, 8);
}

async function fetchWithTimeout(url: string, ms: number) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    return res;
  } finally {
    clearTimeout(t);
  }
}

async function fetchViaCep(cep: string): Promise<{ cidade: string; uf: string } | null> {
  // 1) ViaCEP com 1 retry
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetchWithTimeout(`https://viacep.com.br/ws/${cep}/json/`, FETCH_TIMEOUT_MS);
      if (res.ok) {
        const data = await res.json();
        if (!data?.erro && data?.localidade && data?.uf) {
          return { cidade: data.localidade, uf: data.uf };
        }
        if (data?.erro) return null; // CEP inexistente, não tenta fallback
      }
    } catch {}
  }
  // 2) Fallback BrasilAPI v2
  try {
    const res = await fetchWithTimeout(`https://brasilapi.com.br/api/cep/v2/${cep}`, FETCH_TIMEOUT_MS);
    if (res.ok) {
      const data = await res.json();
      if (data?.city && data?.state) {
        return { cidade: data.city, uf: data.state };
      }
    }
  } catch {}
  // 3) Fallback BrasilAPI v1
  try {
    const res = await fetchWithTimeout(`https://brasilapi.com.br/api/cep/v1/${cep}`, FETCH_TIMEOUT_MS);
    if (res.ok) {
      const data = await res.json();
      if (data?.city && data?.state) {
        return { cidade: data.city, uf: data.state };
      }
    }
  } catch {}
  return null;
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
    const cursor: string | null = body?.cursor ?? null;
    const cepMin: string | null = body?.cep_min ?? null;
    const cepMax: string | null = body?.cep_max ?? null;
    const onlyMissing: boolean = !!body?.only_missing;

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Buscar próximos clientes com CEP. Em modo only_missing, só os com cidade null.
    let query = admin
      .from("clientes")
      .select("id, cep, cidade, uf")
      .not("cep", "is", null)
      .order("cep", { ascending: true })
      .limit(CHUNK * 5);
    if (onlyMissing) query = query.is("cidade", null);
    if (cursor) query = query.gt("cep", cursor);
    else if (cepMin) query = query.gte("cep", cepMin);
    if (cepMax) query = query.lt("cep", cepMax);

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
    const lote = clientes.filter((c: any) => c.cepNorm <= lastCep);

    // 1) Consultar cache de CEPs
    const cepMap = new Map<string, { cidade: string; uf: string }>();
    const { data: cached } = await admin
      .from("cep_cache")
      .select("cep, cidade, uf")
      .in("cep", uniqueCeps);
    for (const row of cached || []) {
      cepMap.set(row.cep, { cidade: row.cidade, uf: row.uf });
    }

    // 2) CEPs não-cached → ViaCEP/BrasilAPI em paralelo
    const missing = uniqueCeps.filter((c) => !cepMap.has(c));
    const newlyResolved: { cep: string; cidade: string; uf: string }[] = [];
    const failedCeps: string[] = [];
    let i = 0;
    async function worker() {
      while (i < missing.length) {
        const idx = i++;
        const cep = missing[idx];
        const data = await fetchViaCep(cep);
        if (data) {
          cepMap.set(cep, data);
          newlyResolved.push({ cep, ...data });
        } else {
          failedCeps.push(cep);
        }
      }
    }
    await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

    // 3) Gravar novos CEPs no cache (await para garantir persistência)
    if (newlyResolved.length > 0) {
      for (let k = 0; k < newlyResolved.length; k += 500) {
        const batch = newlyResolved.slice(k, k + 500);
        await admin.from("cep_cache").upsert(batch, { onConflict: "cep" });
      }
    }

    // 4) Agrupar clientes por (cidade, uf) resolvido e fazer 1 UPDATE por grupo
    const groups = new Map<string, { cidade: string; uf: string; ids: string[] }>();
    for (const c of lote) {
      const info = cepMap.get(c.cepNorm);
      if (!info) continue;
      if (c.cidade === info.cidade && c.uf === info.uf) continue;
      const key = `${info.cidade}|${info.uf}`;
      const g = groups.get(key);
      if (g) g.ids.push(c.id);
      else groups.set(key, { cidade: info.cidade, uf: info.uf, ids: [c.id] });
    }

    let updated = 0;
    await Promise.all(
      Array.from(groups.values()).map(async (g) => {
        for (let k = 0; k < g.ids.length; k += 500) {
          const batchIds = g.ids.slice(k, k + 500);
          const { error } = await admin
            .from("clientes")
            .update({ cidade: g.cidade, uf: g.uf })
            .in("id", batchIds);
          if (!error) updated += batchIds.length;
        }
      })
    );

    return new Response(JSON.stringify({
      done: false,
      processed: lote.length,
      unique_ceps: uniqueCeps.length,
      cache_hits: uniqueCeps.length - missing.length,
      viacep_resolved: newlyResolved.length,
      failed: failedCeps.length,
      failed_ceps: failedCeps.slice(0, 20),
      updated,
      next_cursor: lastCep,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
