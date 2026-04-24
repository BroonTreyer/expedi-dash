import { useEffect, useMemo, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useAuth";

export type EtapaPortaria = "aguardando" | "patio" | "carregando" | "expedido";

export interface StatusPortariaInfo {
  etapa: EtapaPortaria;
  label: string;
  chegada: string | null;
  saida: string | null;
}

const ORDEM: Record<EtapaPortaria, number> = {
  aguardando: 0,
  patio: 1,
  carregando: 2,
  expedido: 3,
};

const LABELS: Record<EtapaPortaria, string> = {
  aguardando: "Aguardando chegada",
  patio: "No pátio",
  carregando: "Carregando",
  expedido: "Expedido",
};

interface MovRow {
  carga_id: string | null;
  tipo_movimento: string | null;
  etapa_terceirizado: string | null;
  horario_entrada: string | null;
  horario_saida_final: string | null;
  data_hora: string | null;
}

function deriveEtapa(movs: MovRow[]): EtapaPortaria {
  let etapa: EtapaPortaria = "aguardando";
  for (const m of movs) {
    let cur: EtapaPortaria = "aguardando";
    if (
      m.tipo_movimento === "saida" ||
      m.etapa_terceirizado === "finalizado" ||
      m.horario_saida_final
    ) {
      cur = "expedido";
    } else if (m.etapa_terceirizado === "liberado") {
      cur = "carregando";
    } else if (m.tipo_movimento === "entrada" || m.etapa_terceirizado === "chegada" || m.horario_entrada) {
      cur = "patio";
    }
    if (ORDEM[cur] > ORDEM[etapa]) etapa = cur;
  }
  return etapa;
}

export function useStatusPortariaPorCarga(cargaIds: string[]) {
  const queryClient = useQueryClient();
  const session = useSession();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Stable key for memoization
  const idsKey = useMemo(() => [...cargaIds].sort().join("|"), [cargaIds]);

  const query = useQuery({
    queryKey: ["status_portaria_por_carga", idsKey],
    enabled: !!session && cargaIds.length > 0,
    staleTime: 15_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("movimentacoes_portaria")
        .select("carga_id, tipo_movimento, etapa_terceirizado, horario_entrada, horario_saida_final, data_hora")
        .in("carga_id", cargaIds)
        .eq("categoria", "terceirizado");
      if (error) throw error;

      const grouped = new Map<string, MovRow[]>();
      for (const row of (data ?? []) as MovRow[]) {
        if (!row.carga_id) continue;
        const arr = grouped.get(row.carga_id) ?? [];
        arr.push(row);
        grouped.set(row.carga_id, arr);
      }

      const result = new Map<string, StatusPortariaInfo>();
      for (const id of cargaIds) {
        const movs = grouped.get(id) ?? [];
        const etapa = deriveEtapa(movs);
        // Earliest entrada / latest saida for tooltip
        let chegada: string | null = null;
        let saida: string | null = null;
        for (const m of movs) {
          const ent = m.horario_entrada ?? (m.tipo_movimento === "entrada" ? m.data_hora : null);
          if (ent && (!chegada || ent < chegada)) chegada = ent;
          const sai = m.horario_saida_final ?? (m.tipo_movimento === "saida" ? m.data_hora : null);
          if (sai && (!saida || sai > saida)) saida = sai;
        }
        result.set(id, { etapa, label: LABELS[etapa], chegada, saida });
      }
      return result;
    },
  });

  useEffect(() => {
    if (!session || cargaIds.length === 0) return;
    const channel = supabase
      .channel(`status-portaria-${idsKey}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "movimentacoes_portaria", filter: "categoria=eq.terceirizado" },
        () => {
          if (debounceRef.current) clearTimeout(debounceRef.current);
          debounceRef.current = setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ["status_portaria_por_carga", idsKey] });
          }, 1500);
        }
      )
      .subscribe();
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      supabase.removeChannel(channel);
    };
  }, [idsKey, session, cargaIds.length, queryClient]);

  return query;
}

export const ETAPA_PORTARIA_ORDEM = ORDEM;
export const ETAPA_PORTARIA_LABELS = LABELS;