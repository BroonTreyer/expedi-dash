import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Preços médios nacionais de Diesel S10 por região — fallback estável.
// Atualize ocasionalmente; usado quando ANP/web não responde.
const FALLBACK_DIESEL_S10: Record<string, number> = {
  AC: 7.45, AL: 6.55, AP: 7.20, AM: 7.10, BA: 6.65, CE: 6.60,
  DF: 6.40, ES: 6.45, GO: 6.30, MA: 6.95, MT: 6.45, MS: 6.40,
  MG: 6.40, PA: 7.05, PB: 6.55, PR: 6.30, PE: 6.55, PI: 6.85,
  RJ: 6.55, RN: 6.65, RS: 6.30, RO: 7.10, RR: 7.95, SC: 6.30,
  SP: 6.20, SE: 6.55, TO: 6.85,
};
const FALLBACK_DEFAULT = 6.50;

function getServiceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

/** Tenta buscar preço médio de Diesel S10 para a UF.
 *  Estratégia simples: usa fallback estático (a API ANP é instável e exige scraping pesado).
 *  Se quiser plugar uma fonte real depois, basta substituir esta função.
 */
async function fetchPrecoDieselUF(uf: string): Promise<{ valor: number; fonte: string }> {
  const upper = uf.toUpperCase().trim();
  // Aqui é um bom ponto de extensão: tentar API real e cair para fallback no catch.
  const valor = FALLBACK_DIESEL_S10[upper] ?? FALLBACK_DEFAULT;
  return { valor, fonte: "fallback_v1" };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Require authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const authClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: claims, error: claimsErr } = await authClient.auth.getClaims(
      authHeader.replace("Bearer ", "")
    );
    if (claimsErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const uf = (url.searchParams.get("uf") || "GO").toUpperCase().trim();
    const tipo = (url.searchParams.get("tipo") || "diesel_s10").toLowerCase();
    const force = url.searchParams.get("force") === "1";

    const supabase = getServiceClient();

    // Cache 7 dias
    if (!force) {
      const { data: cached } = await supabase
        .from("combustivel_precos")
        .select("uf, tipo, valor_litro, fonte, atualizado_em")
        .eq("uf", uf)
        .eq("tipo", tipo)
        .maybeSingle();
      if (cached) {
        const ageDays = (Date.now() - new Date(cached.atualizado_em).getTime()) / 86400000;
        if (ageDays < 7) {
          return new Response(
            JSON.stringify({ uf, tipo, valor_litro: cached.valor_litro, fonte: cached.fonte, atualizado_em: cached.atualizado_em, fromCache: true }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    const { valor, fonte } = await fetchPrecoDieselUF(uf);

    await supabase.from("combustivel_precos").upsert(
      { uf, tipo, valor_litro: valor, fonte, atualizado_em: new Date().toISOString() },
      { onConflict: "uf,tipo" }
    );

    return new Response(
      JSON.stringify({ uf, tipo, valor_litro: valor, fonte, atualizado_em: new Date().toISOString(), fromCache: false }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message, valor_litro: FALLBACK_DEFAULT }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});