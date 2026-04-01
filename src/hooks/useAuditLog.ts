import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AuditEntry {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  user_id: string | null;
  user_email: string | null;
  changes: Record<string, any>;
  created_at: string;
}

export function useAuditLog(entityType: string, entityId: string) {
  return useQuery({
    queryKey: ["audit_log", entityType, entityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_log")
        .select("*")
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as AuditEntry[];
    },
    enabled: !!entityId,
    staleTime: 15_000,
  });
}

export function useAuditLogByCarga(cargaId: string) {
  return useQuery({
    queryKey: ["audit_log", "carga", cargaId],
    queryFn: async () => {
      // Buscar logs do carregamento e de todos os pedidos da carga
      const { data, error } = await supabase
        .from("audit_log")
        .select("*")
        .or(`and(entity_type.eq.carregamento,entity_id.eq.${cargaId})`)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as AuditEntry[];
    },
    enabled: !!cargaId,
    staleTime: 15_000,
  });
}
