import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSession } from "@/hooks/useAuth";

export interface Motorista {
  id: string;
  nome_completo: string;
  cpf: string | null;
  telefone: string | null;
  foto_documento_url: string | null;
  ativo: boolean;
  created_at: string;
}

export function useMotoristas(search?: string) {
  return useQuery({
    queryKey: ["motoristas", search],
    queryFn: async () => {
      let q = supabase
        .from("motoristas")
        .select("*")
        .eq("ativo", true)
        .order("nome_completo");
      if (search?.trim()) {
        const s = search.trim();
        q = q.or(`nome_completo.ilike.%${s}%,cpf.ilike.%${s}%`);
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as Motorista[];
    },
  });
}

export function useCreateMotorista() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { nome_completo: string; cpf?: string; telefone?: string; fotoFile?: File }) => {
      const { data, error } = await supabase
        .from("motoristas")
        .insert({ nome_completo: input.nome_completo, cpf: input.cpf || null, telefone: input.telefone || null } as any)
        .select()
        .single();
      if (error) throw error;
      const motorista = data as unknown as Motorista;

      if (input.fotoFile) {
        const path = `motoristas/${motorista.id}/documento`;
        const { error: upErr } = await supabase.storage
          .from("portaria")
          .upload(path, input.fotoFile, { upsert: true });
        if (upErr) throw upErr;

        const { data: urlData } = await supabase.storage
          .from("portaria")
          .createSignedUrl(path, 60 * 60 * 24 * 365);

        if (urlData?.signedUrl) {
          await supabase
            .from("motoristas")
            .update({ foto_documento_url: urlData.signedUrl } as any)
            .eq("id", motorista.id);
          motorista.foto_documento_url = urlData.signedUrl;
        }
      }
      return motorista;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["motoristas"] });
      toast.success("Motorista cadastrado com sucesso");
    },
    onError: (e: any) => toast.error(e.message || "Erro ao cadastrar motorista"),
  });
}

export function useUpdateMotorista() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; nome_completo: string; cpf?: string; telefone?: string; fotoFile?: File }) => {
      const updates: any = { nome_completo: input.nome_completo, cpf: input.cpf || null, telefone: input.telefone || null };

      if (input.fotoFile) {
        const path = `motoristas/${input.id}/documento`;
        const { error: upErr } = await supabase.storage
          .from("portaria")
          .upload(path, input.fotoFile, { upsert: true });
        if (upErr) throw upErr;

        const { data: urlData } = await supabase.storage
          .from("portaria")
          .createSignedUrl(path, 60 * 60 * 24 * 365);
        if (urlData?.signedUrl) updates.foto_documento_url = urlData.signedUrl;
      }

      const { error } = await supabase
        .from("motoristas")
        .update(updates)
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["motoristas"] });
      toast.success("Motorista atualizado");
    },
    onError: (e: any) => toast.error(e.message || "Erro ao atualizar"),
  });
}

export function useDeleteMotorista() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("motoristas")
        .update({ ativo: false } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["motoristas"] });
      toast.success("Motorista removido");
    },
    onError: (e: any) => toast.error(e.message || "Erro ao remover"),
  });
}
