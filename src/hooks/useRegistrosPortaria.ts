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
  const { data, error } = await supabase.functions.invoke("ocr-portaria", {
    body: { imageUrl, tipo },
  });
  if (error) throw error;
  return data;
}
