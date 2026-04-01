import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

function generateToken(length = 12): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let result = "";
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  for (const byte of array) {
    result += chars[byte % chars.length];
  }
  return result;
}

export function useCreatePortalToken() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { carga_id: string; nome_carga?: string; placa?: string; motorista?: string; transportadora?: string }) => {
      const token = generateToken();
      const { data, error } = await supabase
        .from("portal_tokens")
        .insert({
          token,
          carga_id: params.carga_id,
          nome_carga: params.nome_carga || null,
          placa: params.placa || null,
          motorista: params.motorista || null,
          transportadora: params.transportadora || null,
          criado_por: (await supabase.auth.getUser()).data.user?.id || null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      const url = `${window.location.origin}/portal/${(data as any).token}`;
      navigator.clipboard.writeText(url).then(() => {
        toast.success("Link copiado para a área de transferência!");
      }).catch(() => {
        toast.success("Link gerado: " + url);
      });
      qc.invalidateQueries({ queryKey: ["portal_tokens"] });
    },
    onError: (e: any) => toast.error(e.message),
  });
}
