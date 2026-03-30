import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function ocrPlacaPlateRecognizer(imageUrl: string): Promise<{ texto: string; confianca: number }> {
  const token = Deno.env.get("PLATE_RECOGNIZER_TOKEN");
  if (!token) throw new Error("PLATE_RECOGNIZER_TOKEN not configured");

  // Download the image first
  const imgResp = await fetch(imageUrl);
  if (!imgResp.ok) throw new Error("Failed to download image");
  const imgBuffer = await imgResp.arrayBuffer();
  const base64 = btoa(String.fromCharCode(...new Uint8Array(imgBuffer)));

  const response = await fetch("https://api.platerecognizer.com/v1/plate-reader/", {
    method: "POST",
    headers: {
      Authorization: `Token ${token}`,
    },
    body: (() => {
      const form = new FormData();
      form.append("upload", base64);
      form.append("regions", "br");
      return form;
    })(),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("Plate Recognizer error:", response.status, errText);

    if (response.status === 429) {
      throw new Error("Rate limit exceeded. Tente novamente mais tarde.");
    }
    if (response.status === 403) {
      throw new Error("Limite mensal de leituras atingido.");
    }
    throw new Error(`Plate Recognizer error: ${response.status}`);
  }

  const data = await response.json();
  const results = data.results;

  if (!results || results.length === 0) {
    return { texto: "", confianca: 0 };
  }

  const best = results[0];
  const plate = best.plate?.toUpperCase() || "";
  const score = Math.round((best.score || 0) * 100);

  return { texto: plate, confianca: score };
}

async function ocrKmGemini(imageUrl: string): Promise<{ texto: string; confianca: number }> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content: "Você é um sistema de OCR especializado em leitura de odômetros/hodômetros de veículos. Analise a imagem e extraia o valor numérico da quilometragem mostrada no painel. Use a tool read_result para retornar o resultado.",
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Leia o valor do odômetro/quilometragem nesta imagem. Retorne o valor numérico (apenas números) e um nível de confiança de 0 a 100." },
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
                texto: { type: "string", description: "Valor numérico do KM lido (ex: 145320)" },
                confianca: { type: "number", description: "Nível de confiança da leitura de 0 a 100" },
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
    throw new Error(`AI error: ${response.status}`);
  }

  const data = await response.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

  if (!toolCall) {
    const content = data.choices?.[0]?.message?.content || "";
    return { texto: content, confianca: 30 };
  }

  return JSON.parse(toolCall.function.arguments);
}

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

    let result: { texto: string; confianca: number };

    if (tipo === "placa") {
      result = await ocrPlacaPlateRecognizer(imageUrl);
    } else {
      result = await ocrKmGemini(imageUrl);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ocr-portaria error:", e);
    const message = e instanceof Error ? e.message : "Unknown error";
    const status = message.includes("Rate limit") || message.includes("Limite mensal") ? 429 : 500;
    return new Response(
      JSON.stringify({ error: message }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
