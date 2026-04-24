import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSession } from "@/hooks/useAuth";

export function useAppSetting<T = any>(key: string) {
  const session = useSession();
  return useQuery({
    queryKey: ["app_settings", key],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await supabase.from("app_settings").select("value").eq("key", key).maybeSingle();
      if (error) throw error;
      return (data?.value ?? null) as T | null;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateAppSetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: any }) => {
      const { data, error } = await supabase.from("app_settings").upsert({ key, value }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["app_settings", vars.key] });
      toast.success("Configuração salva");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

/** Helper: preço de combustível (R$/L) */
export function usePrecoCombustivel(): number {
  const { data } = useAppSetting<{ valor: number }>("preco_combustivel");
  return data?.valor ?? 6.2;
}