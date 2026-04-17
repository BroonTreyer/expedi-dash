import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function normalizeCep(v: any): string {
  return String(v ?? "").replace(/\D/g, "").padStart(0, "0").slice(0, 8);
}

async function fetchViaCep(cep: string): Promise<{ localidade?: string; uf?: string; erro?: boolean } | null> {
  try {
    const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.erro) return null;
    return data;
  } catch {
    return null;
  }
}

async function processBatch(ceps: string[], concurrency = 15): Promise<Map<string, { cidade: string; uf: string }>> {
  const result = new Map<string, { cidade: string; uf: string }>();
  let i = 0;
  async function worker() {
    while (i < ceps.length) {
      const idx = i++;
      const cep = ceps[idx];
      const data = await fetchViaCep(cep);
      if (data && data.localidade && data.uf) {
        result.set(cep, { cidade: data.localidade, uf: data.uf });
      }
      // pequeno delay para não estourar rate-limit
      await new Promise((r) => setTimeout(r, 30));
    }
  }
  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return result;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Carregar todos os clientes com CEP (paginado)
    let all: { id: string; cep: string | null; cidade: string | null; uf: string | null }[] = [];
    let from = 0;
    const pageSize = 1000;
    while (true) {
      const { data, error } = await admin
        .from("clientes")
        .select("id, cep, cidade, uf")
        .not("cep", "is", null)
        .range(from, from + pageSize - 1);
      if (error) throw error;
      if (!data || data.length === 0) break;
      all = all.concat(data as any);
      if (data.length < pageSize) break;
      from += data.length;
    }

    // CEPs únicos válidos (8 dígitos)
    const uniqueCeps = Array.from(
      new Set(
        all
          .map((c) => normalizeCep(c.cep))
          .filter((c) => /^\d{8}$/.test(c))
      )
    );

    // Buscar no ViaCEP em paralelo
    const cepMap = await processBatch(uniqueCeps, 15);

    // Montar updates: somente quando ViaCEP retornou e o valor difere
    let updated = 0;
    let errors = 0;
    const updates: { id: string; cidade: string; uf: string }[] = [];
    for (const c of all) {
      const cep = normalizeCep(c.cep);
      const info = cepMap.get(cep);
      if (!info) continue;
      if (c.cidade === info.cidade && c.uf === info.uf) continue;
      updates.push({ id: c.id, cidade: info.cidade, uf: info.uf });
    }

    // Aplicar updates em lotes
    for (let i = 0; i < updates.length; i += 200) {
      const batch = updates.slice(i, i + 200);
      await Promise.all(
        batch.map(async (u) => {
          const { error } = await admin
            .from("clientes")
            .update({ cidade: u.cidade, uf: u.uf })
            .eq("id", u.id);
          if (error) errors++;
          else updated++;
        })
      );
    }

    return new Response(
      JSON.stringify({
        processed: all.length,
        unique_ceps: uniqueCeps.length,
        viacep_resolved: cepMap.size,
        updated,
        errors,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
