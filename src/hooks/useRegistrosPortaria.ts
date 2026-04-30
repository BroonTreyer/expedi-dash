import { supabase } from "@/integrations/supabase/client";

export async function processarOCR(imageUrl: string, tipo: "placa" | "km"): Promise<{ texto: string; confianca: number }> {
  const { data, error } = await supabase.functions.invoke("ocr-portaria", {
    body: { imageUrl, tipo },
  });
  if (error) throw error;
  return { texto: data.texto, confianca: data.confianca };
}
