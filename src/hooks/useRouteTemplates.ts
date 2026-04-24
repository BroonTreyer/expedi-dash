import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSession } from "@/hooks/useAuth";

export interface RouteTemplateParada {
  codigo_cliente?: string | null;
  cliente?: string | null;
  cidade: string;
  uf: string;
  ordem: number;
}

export interface RouteTemplate {
  id: string;
  nome: string;
  descricao: string | null;
  origem: string;
  paradas: RouteTemplateParada[];
  tipo_caminhao: string | null;
  times_used: number;
  created_at: string;
  updated_at: string;
}

export function useRouteTemplates() {
  const session = useSession();
  return useQuery({
    queryKey: ["route_templates"],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("route_templates")
        .select("*")
        .order("times_used", { ascending: false })
        .order("nome");
      if (error) throw error;
      return (data || []) as unknown as RouteTemplate[];
    },
    staleTime: 60_000,
  });
}

export function useCreateRouteTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: {
      nome: string;
      descricao?: string | null;
      origem: string;
      paradas: RouteTemplateParada[];
      tipo_caminhao?: string | null;
    }) => {
      const { data, error } = await supabase
        .from("route_templates")
        .insert(values as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["route_templates"] });
      toast.success("Template salvo");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeleteRouteTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("route_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["route_templates"] });
      toast.success("Template excluído");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export async function bumpTemplateUsage(id: string) {
  const { data } = await supabase.from("route_templates").select("times_used").eq("id", id).maybeSingle();
  await supabase
    .from("route_templates")
    .update({ times_used: ((data?.times_used as number | undefined) ?? 0) + 1 })
    .eq("id", id);
}