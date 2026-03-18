import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { imageUrl, tipo } = await req.json();
    if (!imageUrl || !tipo) {
      return new Response(JSON.stringify({ error: "imageUrl and tipo are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt =
      tipo === "placa"
        ? "Você é um sistema de OCR especializado em placas de veículos brasileiros. Analise a imagem e extraia o texto da placa. Placas brasileiras podem ter formato ABC-1234 ou ABC1D23 (Mercosul). Use a tool read_result para retornar o resultado."
        : "Você é um sistema de OCR especializado em leitura de odômetros/hodômetros de veículos. Analise a imagem e extraia o valor numérico da quilometragem mostrada no painel. Use a tool read_result para retornar o resultado.";

    const userPrompt =
      tipo === "placa"
        ? "Leia a placa do veículo nesta imagem. Retorne o texto da placa e um nível de confiança de 0 a 100."
        : "Leia o valor do odômetro/quilometragem nesta imagem. Retorne o valor numérico (apenas números) e um nível de confiança de 0 a 100.";

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: userPrompt },
              { type: "image_url", image_url: { url: imageUrl } },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "read_result",
              description: "Return the OCR reading result",
              parameters: {
                type: "object",
                properties: {
                  texto: {
                    type: "string",
                    description: tipo === "placa" ? "Texto da placa lida (ex: ABC1D23)" : "Valor numérico do KM lido (ex: 145320)",
                  },
                  confianca: {
                    type: "number",
                    description: "Nível de confiança da leitura de 0 a 100",
                  },
                },
                required: ["texto", "confianca"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "read_result" } },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);

      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Tente novamente em alguns segundos." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "Erro ao processar imagem" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall) {
      // Fallback: try to parse from content
      const content = data.choices?.[0]?.message?.content || "";
      return new Response(JSON.stringify({ texto: content, confianca: 30 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = JSON.parse(toolCall.function.arguments);
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ocr-portaria error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
