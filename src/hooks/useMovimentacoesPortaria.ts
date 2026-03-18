import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface MovimentacaoPortaria {
  id: string;
  tipo_movimento: "entrada" | "saida";
  categoria: string;
  placa: string | null;
  motorista: string | null;
  empresa: string | null;
  destino_setor: string | null;
  motivo: string | null;
  carga_id: string | null;
  foto_placa_url: string | null;
  texto_placa_lido: string | null;
  confianca_placa: number | null;
  placa_confirmada: string | null;
  foto_documento_url: string | null;
  observacoes: string | null;
  usuario_id: string | null;
  data_hora: string;
  movimento_vinculado_id: string | null;
  created_at: string;
}

export const CATEGORIAS = [
  { value: "carga_propria", label: "Carga Própria" },
  { value: "fornecedor", label: "Fornecedor" },
  { value: "visitante", label: "Visitante" },
  { value: "prestador", label: "Prestador de Serviço" },
  { value: "outros", label: "Outros" },
] as const;

export const SETORES = [
  { value: "expedicao", label: "Expedição" },
  { value: "recebimento", label: "Recebimento" },
  { value: "administrativo", label: "Administrativo" },
  { value: "manutencao", label: "Manutenção" },
  { value: "outros", label: "Outros" },
] as const;

export function useMovimentacoes(dataStr: string) {
  return useQuery({
    queryKey: ["movimentacoes_portaria", dataStr],
    queryFn: async () => {
      const startOfDay = `${dataStr}T00:00:00.000Z`;
      const nextDay = new Date(dataStr);
      nextDay.setDate(nextDay.getDate() + 1);
      const endOfDay = `${nextDay.toISOString().split("T")[0]}T00:00:00.000Z`;

      const { data, error } = await supabase
        .from("movimentacoes_portaria" as any)
        .select("*")
        .gte("data_hora", startOfDay)
        .lt("data_hora", endOfDay)
        .order("data_hora", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as MovimentacaoPortaria[];
    },
  });
}

export function useCreateMovimentacao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (mov: Partial<MovimentacaoPortaria>) => {
      const { data, error } = await supabase
        .from("movimentacoes_portaria" as any)
        .insert(mov as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as MovimentacaoPortaria;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["movimentacoes_portaria"] });
      toast.success("Movimento registrado com sucesso!");
    },
    onError: (err: any) => {
      toast.error("Erro ao registrar movimento: " + err.message);
    },
  });
}

export function useDeleteMovimentacao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("movimentacoes_portaria" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["movimentacoes_portaria"] });
      toast.success("Movimento removido.");
    },
    onError: (err: any) => {
      toast.error("Erro ao remover: " + err.message);
    },
  });
}

export async function uploadFotoMovimentacao(file: File, prefix: string): Promise<string> {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `movimentacoes/${prefix}_${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("portaria").upload(path, file, { upsert: true });
  if (error) throw error;
  const { data: urlData } = supabase.storage.from("portaria").getPublicUrl(path);
  return urlData.publicUrl;
}
