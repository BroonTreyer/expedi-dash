import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useAuth";
import { toast } from "sonner";

export type OcorrenciaCarga = {
  id: string;
  created_at: string;
  tipo: string;
  motivo: string;
  observacao: string | null;
  carga_id: string | null;
  nome_carga: string | null;
  placa: string | null;
  motorista: string | null;
  transportadora: string | null;
  peso_total: number | null;
  qtd_pedidos: number | null;
  data_carga: string | null;
  registrado_por: string | null;
  registrado_por_email: string | null;
};

export function useOcorrencias(dateFrom?: string, dateTo?: string) {
  const session = useSession();
  return useQuery({
    queryKey: ["ocorrencias_carga", dateFrom, dateTo],
    enabled: !!session,
    queryFn: async () => {
      let q = supabase
        .from("ocorrencias_carga" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1000);
      if (dateFrom) q = q.gte("created_at", `${dateFrom}T00:00:00`);
      if (dateTo) q = q.lte("created_at", `${dateTo}T23:59:59`);
      const { data, error } = await q;
      if (error) throw error;
      return (data as unknown as OcorrenciaCarga[]) ?? [];
    },
    staleTime: 30_000,
  });
}

export function useCreateOcorrencia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: Partial<OcorrenciaCarga>) => {
      const { data: { user } } = await supabase.auth.getUser();
      const payload: any = {
        ...values,
        registrado_por: user?.id ?? null,
        registrado_por_email: user?.email ?? null,
      };
      const { data, error } = await supabase
        .from("ocorrencias_carga" as any)
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ocorrencias_carga"] });
    },
    onError: (e: any) => toast.error(e.message || "Erro ao registrar ocorrência"),
  });
}