import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSession } from "@/hooks/useAuth";

export interface Caminhao {
  id: string;
  placa: string;
  renavam: string | null;
  tipo_caminhao: string | null;
  transportadora: string | null;
  motorista_id: string | null;
  ativo: boolean;
  created_at: string;
  motorista?: {
    id: string;
    nome_completo: string;
    telefone: string | null;
    cpf: string | null;
  } | null;
}

export function useCaminhoes(search?: string) {
  const session = useSession();
  return useQuery({
    queryKey: ["caminhoes", search],
    enabled: !!session,
    queryFn: async () => {
      let q = supabase
        .from("caminhoes")
        .select("*, motoristas(id, nome_completo, telefone, cpf)")
        .eq("ativo", true)
        .order("placa")
        .limit(50);
      if (search && search.trim().length >= 2) {
        q = q.ilike("placa", `%${search.trim()}%`);
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []).map((row: any) => ({
        ...row,
        motorista: row.motoristas ?? null,
        motoristas: undefined,
      })) as Caminhao[];
    },
  });
}


export function useCreateCaminhao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: { placa: string; renavam?: string; tipo_caminhao?: string; motorista_id?: string | null; transportadora?: string }) => {
      const { data, error } = await supabase.from("caminhoes").insert({
        placa: values.placa.toUpperCase().trim(),
        renavam: values.renavam?.trim() || null,
        tipo_caminhao: values.tipo_caminhao || null,
        motorista_id: values.motorista_id || null,
        transportadora: values.transportadora?.trim() || null,
      }).select("*, motoristas(id, nome_completo, telefone, cpf)").single();
      if (error) throw error;
      return { ...data, motorista: (data as any).motoristas ?? null } as Caminhao;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["caminhoes"] }); toast.success("Caminhão cadastrado"); },
    onError: (e: any) => toast.error(e.message?.includes("caminhoes_placa_unique") ? "Placa já cadastrada" : e.message),
  });
}

export function useUpdateCaminhao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: { id: string; placa: string; renavam?: string; tipo_caminhao?: string; motorista_id?: string | null; transportadora?: string }) => {
      const { data, error } = await supabase.from("caminhoes").update({
        placa: values.placa.toUpperCase().trim(),
        renavam: values.renavam?.trim() || null,
        tipo_caminhao: values.tipo_caminhao || null,
        motorista_id: values.motorista_id || null,
        transportadora: values.transportadora?.trim() || null,
      }).eq("id", values.id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["caminhoes"] }); toast.success("Caminhão atualizado"); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeleteCaminhao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("caminhoes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["caminhoes"] }); toast.success("Caminhão excluído"); },
    onError: (e: any) => toast.error(e.message),
  });
}
