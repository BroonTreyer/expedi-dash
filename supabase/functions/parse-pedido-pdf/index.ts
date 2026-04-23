import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Você extrai dados estruturados de PDFs de "PEDIDO DE VENDA" emitidos pelo Sankhya da Fricó Alimentos.

Regras:
- "numero_pedido" é o valor de "Nota Nro." (string apenas com dígitos). Se não houver, deixe vazio.
- "nr_unico" é o valor de "Nr.Único".
- "emissao" no formato ISO (YYYY-MM-DDTHH:mm:ss) extraído de "Emissão" (que vem como dd/MM/yyyy HH.mm.ss).
- "cliente": separe "código-NOME" do campo Cliente (ex: "794-ILDETE ALVES GUIMARAES" -> codigo "794", nome "ILDETE ALVES GUIMARAES"). Município aparece como "CIDADE-UF".
- "vendedor": separe "código-NOME" do campo Vendedor (ex: "15-ALCIR").
- "itens": cada linha da tabela "Itens do Pedido". A coluna "Descrição" vem como "código-NOME PRODUTO" (ex: "730-CALABRESA A GRANEL PCT 2,5 KGS"). "quantidade" é o valor da coluna Qtde (use ponto como separador decimal). "unidade" é o valor de "Emb." (KG, UN, etc). IGNORE preços (Vlr.Unit, Valor Total) e a linha "Total Líquido".
- Não invente dados. Se um campo não estiver no PDF, retorne string vazia ou array vazio.`;

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
              { type: "text", text: `Extraia os dados deste PEDIDO DE VENDA${fileName ? ` (arquivo: ${fileName})` : ""}.` },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_pedido",
              description: "Retorna os dados estruturados do pedido de venda.",
              parameters: {
                type: "object",
                properties: {
                  numero_pedido: { type: "string", description: "Valor de 'Nota Nro.' (apenas dígitos)" },
                  nr_unico: { type: "string" },
                  emissao: { type: "string", description: "ISO 8601" },
                  cliente: {
                    type: "object",
                    properties: {
                      codigo: { type: "string" },
                      nome: { type: "string" },
                      cidade: { type: "string" },
                      uf: { type: "string" },
                    },
                    required: ["codigo", "nome"],
                    additionalProperties: false,
                  },
                  vendedor: {
                    type: "object",
                    properties: {
                      codigo: { type: "string" },
                      nome: { type: "string" },
                    },
                    required: ["codigo", "nome"],
                    additionalProperties: false,
                  },
                  itens: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        codigo_produto: { type: "string" },
                        nome_produto: { type: "string" },
                        quantidade: { type: "number" },
                        unidade: { type: "string" },
                      },
                      required: ["codigo_produto", "nome_produto", "quantidade"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["numero_pedido", "cliente", "vendedor", "itens"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_pedido" } },
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
    console.error("parse-pedido-pdf error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});