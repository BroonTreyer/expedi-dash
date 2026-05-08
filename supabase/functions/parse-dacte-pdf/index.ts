import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Você extrai dados estruturados de DACTE (Documento Auxiliar do Conhecimento de Transporte Eletrônico — CT-e modelo 57).

IMPORTANTE: O PDF pode conter MÚLTIPLOS CT-es (um por página ou várias páginas por CT-e). Identifique cada CT-e distinto pelo seu cabeçalho (NÚMERO + SÉRIE + CHAVE DE ACESSO) e retorne UM objeto por CT-e no array "ctes". Não duplique CT-es que ocupem mais de uma página — agrupe pela chave de acesso ou pelo par NÚMERO/SÉRIE.

Regras por CT-e:
- "numero_cte": campo "NÚMERO" do cabeçalho (apenas dígitos, sem zeros à esquerda).
- "serie": campo "SÉRIE" do cabeçalho.
- "valor_frete": "VALOR TOTAL DO SERVIÇO" ou "VALOR TOTAL DA PRESTAÇÃO" (em reais, número decimal com ponto).
- "transportadora": razão social do EMITENTE (transportadora).
- "placa": placa do veículo de tração (campo "PLACA DO VEÍCULO" — só a placa principal).
- "destino_cidade" e "destino_uf": município/UF do DESTINATÁRIO.
- "peso_total": peso bruto total da carga em kg (número decimal com ponto).
- "data_emissao": data de emissão do CT-e em formato YYYY-MM-DD.
- "notas_fiscais": array de strings com TODOS os números das notas fiscais listadas em "DOCUMENTOS ORIGINÁRIOS" / "NF-e". Apenas o número (sem chave de acesso, sem série).
- "tomador": razão social do TOMADOR DO SERVIÇO (quadro "TOMADOR DO SERVIÇO" do DACTE). Se o quadro indicar o tomador como remetente/destinatário/expedidor/recebedor, use a razão social desse papel correspondente.

Não invente dados. Se um campo não estiver legível, retorne string vazia, 0 ou array vazio.`;

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
              { type: "text", text: `Extraia os dados deste DACTE${fileName ? ` (arquivo: ${fileName})` : ""}.` },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_dacte",
              description: "Retorna a lista de CT-es encontrados no PDF.",
              parameters: {
                type: "object",
                properties: {
                  ctes: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        numero_cte: { type: "string" },
                        serie: { type: "string" },
                        valor_frete: { type: "number" },
                        transportadora: { type: "string" },
                        placa: { type: "string" },
                        destino_cidade: { type: "string" },
                        destino_uf: { type: "string" },
                        peso_total: { type: "number" },
                        data_emissao: { type: "string" },
                        notas_fiscais: { type: "array", items: { type: "string" } },
                        tomador: { type: "string" },
                      },
                      required: ["numero_cte", "valor_frete", "notas_fiscais"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["ctes"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_dacte" } },
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
      return new Response(JSON.stringify({ error: "Não foi possível extrair os dados do DACTE." }), {
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

    const ctes = Array.isArray(parsed?.ctes) ? parsed.ctes : [];
    return new Response(JSON.stringify({ ctes, fileName }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("parse-dacte-pdf error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});