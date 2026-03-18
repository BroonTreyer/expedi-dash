import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface RegistroPortaria {
  id: string;
  carga_id: string;
  tipo_registro: "saida" | "retorno";
  placa_prevista: string | null;
  foto_placa_url: string | null;
  texto_placa_lido: string | null;
  confianca_placa: number | null;
  foto_km_url: string | null;
  km_lido: number | null;
  confianca_km: number | null;
  km_confirmado: number | null;
  placa_confirmada: string | null;
  km_rodado_real: number | null;
  divergencia_placa: boolean;
  divergencia_km: boolean;
  status_validacao: string;
  leitura_modo: string;
  usuario_id: string | null;
  created_at: string;
}

export function useRegistrosPortaria(data?: string) {
  return useQuery({
    queryKey: ["registros_portaria", data],
    queryFn: async () => {
      let query = supabase
        .from("registros_portaria" as any)
        .select("*")
        .order("created_at", { ascending: false });

      if (data) {
        const startOfDay = `${data}T00:00:00.000Z`;
        const nextDay = new Date(data);
        nextDay.setDate(nextDay.getDate() + 1);
        const endOfDay = `${nextDay.toISOString().split("T")[0]}T00:00:00.000Z`;
        query = query.gte("created_at", startOfDay).lt("created_at", endOfDay);
      }

      const { data: rows, error } = await query;
      if (error) throw error;
      return (rows ?? []) as unknown as RegistroPortaria[];
    },
  });
}

export function useRegistrosPortariaByCarga(cargaId: string | null) {
  return useQuery({
    queryKey: ["registros_portaria", "carga", cargaId],
    enabled: !!cargaId,
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from("registros_portaria" as any)
        .select("*")
        .eq("carga_id", cargaId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (rows ?? []) as unknown as RegistroPortaria[];
    },
  });
}

export function useCreateRegistroPortaria() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (registro: Partial<RegistroPortaria>) => {
      const { data, error } = await supabase
        .from("registros_portaria" as any)
        .insert(registro as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["registros_portaria"] });
      toast.success("Registro de portaria salvo com sucesso!");
    },
    onError: (err: any) => {
      toast.error("Erro ao salvar registro: " + err.message);
    },
  });
}

export async function uploadFotoPortaria(file: File, cargaId: string, tipo: string): Promise<string> {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${cargaId}/${tipo}_${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("portaria").upload(path, file, { upsert: true });
  if (error) throw error;
  const { data: urlData } = supabase.storage.from("portaria").getPublicUrl(path);
  return urlData.publicUrl;
}

export async function processarOCR(imageUrl: string, tipo: "placa" | "km"): Promise<{ texto: string; confianca: number }> {
  const Tesseract = await import("tesseract.js");
  const { data } = await Tesseract.recognize(imageUrl, "por", {
    logger: () => {},
  });

  const rawText = data.text.trim();
  const confidence = Math.round(data.confidence);

  if (tipo === "placa") {
    // Try Mercosul (ABC1D23) or old format (ABC-1234)
    const cleaned = rawText.replace(/[\s\-\.]/g, "").toUpperCase();
    const match = cleaned.match(/[A-Z]{3}\d[A-Z0-9]\d{2}/) || cleaned.match(/[A-Z]{3}\d{4}/);
    return {
      texto: match ? match[0] : cleaned.slice(0, 7),
      confianca: match ? confidence : Math.min(confidence, 40),
    };
  }

  // KM: extract only digits
  const digits = rawText.replace(/\D/g, "");
  return {
    texto: digits || "0",
    confianca: digits ? confidence : Math.min(confidence, 30),
  };
}
