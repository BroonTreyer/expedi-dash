import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Fetch all Brazilian municipalities from IBGE API
    const ibgeRes = await fetch(
      "https://servicodados.ibge.gov.br/api/v1/localidades/municipios?orderBy=nome"
    );
    if (!ibgeRes.ok) throw new Error("Erro ao consultar API do IBGE");
    const municipios = await ibgeRes.json();

    // Build city -> UF map (normalized)
    const normalize = (s: string) =>
      s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

    const cityUfMap = new Map<string, string>();
    for (const m of municipios) {
      try {
        const uf = m?.microrregiao?.mesorregiao?.UF?.sigla;
        if (uf) cityUfMap.set(normalize(m.nome), uf);
      } catch { /* skip */ }
    }

    // Get offset from query param for chunked processing
    const url = new URL(req.url);
    const offset = parseInt(url.searchParams.get("offset") || "0");
    const limit = 500;

    const { data: clientes, error: fetchErr } = await supabase
      .from("clientes")
      .select("id, cidade")
      .not("cidade", "is", null)
      .is("uf", null)
      .range(offset, offset + limit - 1);

    if (fetchErr) throw fetchErr;

    let updated = 0;
    const updates: { id: string; uf: string }[] = [];

    for (const c of clientes || []) {
      const uf = cityUfMap.get(normalize(c.cidade || ""));
      if (uf) updates.push({ id: c.id, uf });
    }

    // Batch update using individual calls but in parallel chunks
    const chunkSize = 50;
    for (let i = 0; i < updates.length; i += chunkSize) {
      const chunk = updates.slice(i, i + chunkSize);
      const promises = chunk.map(u =>
        supabase.from("clientes").update({ uf: u.uf }).eq("id", u.id)
      );
      const results = await Promise.all(promises);
      updated += results.filter(r => !r.error).length;
    }

    const hasMore = (clientes?.length || 0) === limit;

    return new Response(
      JSON.stringify({ success: true, updated, fetched: clientes?.length || 0, hasMore, nextOffset: offset + limit }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
