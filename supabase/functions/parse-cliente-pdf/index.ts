import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Você extrai dados estruturados de CLIENTE de PDFs comerciais brasileiros (pedidos de venda, propostas, fichas cadastrais, notas fiscais).

Regras:
- Foco SEMPRE no cliente/comprador/destinatário (NÃO no emissor/vendedor/representada).
- "razao_social": razão social do cliente.
- "nome_fantasia": nome fantasia, se houver.
- "cnpj": apenas dígitos (14 dígitos quando possível). Se for CPF, retornar mesmo assim apenas dígitos.
- "inscricao_estadual": apenas dígitos.
- "endereco": logradouro + número (sem cidade/UF/CEP).
- "bairro", "cidade": texto simples.
- "uf": sigla com 2 letras maiúsculas.
- "cep": apenas dígitos (8).
- "telefone": apenas dígitos.
- "email": email do cliente.
- Se um campo não estiver no PDF, retorne string vazia.
- Não invente dados.`;

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

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const fileBase64: string | undefined = body?.fileBase64;
    const fileName: string | undefined = body?.fileName;
    if (!fileBase64) {
      return new Response(JSON.stringify({ error: "fileBase64 is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const dataUrl = `data:application/pdf;base64,${fileBase64}`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              { type: "text", text: `Extraia os dados do CLIENTE deste PDF${fileName ? ` (arquivo: ${fileName})` : ""}.` },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_cliente",
              description: "Retorna os dados estruturados do cliente extraídos do PDF.",
              parameters: {
                type: "object",
                properties: {
                  razao_social: { type: "string" },
                  nome_fantasia: { type: "string" },
                  cnpj: { type: "string" },
                  inscricao_estadual: { type: "string" },
                  endereco: { type: "string" },
                  bairro: { type: "string" },
                  cidade: { type: "string" },
                  uf: { type: "string" },
                  cep: { type: "string" },
                  telefone: { type: "string" },
                  email: { type: "string" },
                },
                required: ["razao_social", "cnpj", "cidade", "uf", "cep"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_cliente" } },
      }),
    });

    if (!aiResp.ok) {
      const txt = await aiResp.text();
      console.error("AI gateway error", aiResp.status, txt);
      if (aiResp.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições atingido. Tente novamente em instantes." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResp.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos da IA esgotados. Adicione créditos no workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "Falha ao processar PDF com IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiJson = await aiResp.json();
    const toolCall = aiJson?.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      console.error("No tool call returned", JSON.stringify(aiJson));
      return new Response(JSON.stringify({ error: "Não foi possível extrair os dados do PDF." }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let parsed: any;
    try {
      parsed = JSON.parse(toolCall.function.arguments);
    } catch (e) {
      console.error("Failed to parse tool arguments", e);
      return new Response(JSON.stringify({ error: "Resposta da IA inválida." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ data: parsed, fileName }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("parse-cliente-pdf error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});