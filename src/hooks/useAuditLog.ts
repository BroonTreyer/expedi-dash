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

/**
 * Busca o histórico de auditoria para um conjunto de carregamentos (rupturas).
 * Filtra no servidor por entity_type e entity_id; o cliente filtra por ações
 * relevantes (peso, ruptura, motivo_ruptura, peso_manual).
 */
export function useAuditLogRupturas(itemIds: string[]) {
  const idsKey = [...itemIds].sort().join(",");
  return useQuery({
    queryKey: ["audit_log", "rupturas", idsKey],
    queryFn: async () => {
      if (itemIds.length === 0) return [] as AuditEntry[];
      const chunks: string[][] = [];
      for (let i = 0; i < itemIds.length; i += 100) {
        chunks.push(itemIds.slice(i, i + 100));
      }
      const all: AuditEntry[] = [];
      for (const chunk of chunks) {
        const { data, error } = await supabase
          .from("audit_log")
          .select("*")
          .eq("entity_type", "carregamento")
          .in("entity_id", chunk)
          .order("created_at", { ascending: false })
          .limit(500);
        if (error) throw error;
        all.push(...((data ?? []) as AuditEntry[]));
      }
      // Filtra por mudanças relevantes
      const relevant = all.filter((e) => {
        const c = e.changes ?? {};
        if (c.novo || c.excluido) return true;
        return (
          "peso" in c ||
          "ruptura" in c ||
          "peso_manual" in c ||
          "motivo_ruptura" in c ||
          "quantidade" in c
        );
      });
      return relevant
        .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
        .slice(0, 200);
    },
    enabled: itemIds.length > 0,
    staleTime: 30_000,
  });
}
