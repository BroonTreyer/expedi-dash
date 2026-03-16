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

    // Build city -> UF map (normalized lowercase, no accents)
    const normalize = (s: string) =>
      s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

    const cityUfMap = new Map<string, string>();
    for (const m of municipios) {
      cityUfMap.set(normalize(m.nome), m.microrregiao.mesorregiao.UF.sigla);
    }

    // Fetch all clients with cidade but no uf
    const { data: clientes, error: fetchErr } = await supabase
      .from("clientes")
      .select("id, cidade")
      .not("cidade", "is", null)
      .is("uf", null);

    if (fetchErr) throw fetchErr;

    let updated = 0;
    const batchSize = 200;

    for (let i = 0; i < (clientes?.length || 0); i += batchSize) {
      const batch = clientes!.slice(i, i + batchSize);
      const updates = batch
        .map((c) => {
          const uf = cityUfMap.get(normalize(c.cidade || ""));
          return uf ? { id: c.id, uf } : null;
        })
        .filter(Boolean);

      for (const u of updates) {
        const { error } = await supabase
          .from("clientes")
          .update({ uf: u!.uf })
          .eq("id", u!.id);
        if (!error) updated++;
      }
    }

    return new Response(
      JSON.stringify({ success: true, updated, total: clientes?.length || 0 }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
