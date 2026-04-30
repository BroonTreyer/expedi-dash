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

