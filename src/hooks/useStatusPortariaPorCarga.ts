import { useEffect, useMemo, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useAuth";

export type EtapaPortaria = "aguardando" | "chegou" | "patio" | "carregando" | "expedido";

export interface StatusPortariaInfo {
  etapa: EtapaPortaria;
  label: string;
  chegada: string | null;
  saida: string | null;
}

const ORDEM: Record<EtapaPortaria, number> = {
  aguardando: 0,
  chegou: 1,
  patio: 2,
  carregando: 3,
  expedido: 4,
};

const LABELS: Record<EtapaPortaria, string> = {
  aguardando: "Aguardando chegada",
  chegou: "Chegou — aguardando liberação",
  patio: "No pátio",
  carregando: "Carregando",
  expedido: "Expedido",
};

interface MovRow {
  carga_id: string | null;
  tipo_movimento: string | null;
  etapa_terceirizado: string | null;
  etapa_carga_propria: string | null;
  categoria: string | null;
  horario_entrada: string | null;
  horario_chegada: string | null;
  horario_saida_final: string | null;
  data_hora: string | null;
}

function deriveEtapa(movs: MovRow[]): EtapaPortaria {
  let etapa: EtapaPortaria = "aguardando";
  // Existe alguma "entrada" registrada para esta carga? Usado para evitar que
  // uma "saida" órfã (sem entrada correspondente) marque indevidamente como Expedido.
  const temEntrada = movs.some((m) => m.tipo_movimento === "entrada");

  for (const m of movs) {
    let cur: EtapaPortaria = "aguardando";
    const isCargaPropria = m.categoria === "carga_propria";

    // Sinais inequívocos de finalização (vale para qualquer categoria)
    const finalizado =
      m.etapa_terceirizado === "finalizado" ||
      !!m.horario_saida_final ||
      m.etapa_carga_propria === "em_rota" ||
      m.etapa_carga_propria === "retornou";

    if (finalizado) {
      cur = "expedido";
    } else if (m.tipo_movimento === "saida") {
      // Saída sem etapa final: só conta como expedido se houver entrada correspondente.
      // Saídas órfãs (sem nenhuma entrada vinculada) são ignoradas — provavelmente
      // movimentos soltos / duplicatas.
      if (temEntrada) cur = "expedido";
      else continue;
    } else if (isCargaPropria) {
      // Carga própria: mapeia etapa_carga_propria
      if (m.etapa_carga_propria === "chegou" || m.horario_entrada) {
        cur = "patio";
      } else if (m.etapa_carga_propria === "aguardando_liberacao" || m.horario_chegada) {
        cur = "chegou";
      }
    } else {
      // Terceirizado em andamento
      if (m.etapa_terceirizado === "liberado") {
        cur = "carregando";
      } else if (m.etapa_terceirizado === "no_patio" || m.horario_entrada) {
        cur = "patio";
      } else if (m.etapa_terceirizado === "chegada" || m.horario_chegada) {
        cur = "chegou";
      }
    }

    if (ORDEM[cur] > ORDEM[etapa]) etapa = cur;
  }
  return etapa;
}

export interface CargaRef {
  carga_id: string;
  data: string; // YYYY-MM-DD
  placa?: string | null;
}

/**
 * Aceita lista de strings (legado — sem filtro de data, todos os movimentos
 * da carga_id são considerados) ou lista de { carga_id, data } (novo —
 * agrega apenas movimentos cuja data_hora esteja na janela [data, data+1d)).
 * O modo novo evita que cargas distintas com o mesmo nome/carga_id em datas
 * diferentes contaminem o status umas das outras.
 */
export function useStatusPortariaPorCarga(input: string[] | CargaRef[]) {
  // Normaliza para CargaRef[]; quando legado, data = "" (sem filtro)
  const refs: CargaRef[] = useMemo(() => {
    if (input.length === 0) return [];
    if (typeof (input as any)[0] === "string") {
      return (input as string[]).map((id) => ({ carga_id: id, data: "" }));
    }
    return input as CargaRef[];
  }, [input]);

  const cargaIds = useMemo(
    () => Array.from(new Set(refs.map((r) => r.carga_id))),
    [refs]
  );
  // Map carga_id -> data (se houver mais de uma data para o mesmo id, usamos a maior)
  const dataByCarga = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of refs) {
      const prev = m.get(r.carga_id);
      if (!prev || (r.data && r.data > prev)) m.set(r.carga_id, r.data);
    }
    return m;
  }, [refs]);
  const placaByCarga = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of refs) {
      if (r.placa) m.set(r.carga_id, r.placa.trim().toUpperCase());
    }
    return m;
  }, [refs]);

  const queryClient = useQueryClient();
  const session = useSession();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Stable key for memoization
  const idsKey = useMemo(
    () => refs.map((r) => `${r.carga_id}@${r.data}`).sort().join("|"),
    [refs]
  );

  const query = useQuery({
    queryKey: ["status_portaria_por_carga", idsKey],
    enabled: !!session && cargaIds.length > 0,
    staleTime: 15_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("movimentacoes_portaria")
        .select("carga_id, tipo_movimento, categoria, etapa_terceirizado, etapa_carga_propria, horario_entrada, horario_chegada, horario_saida_final, data_hora, placa")
        .in("carga_id", cargaIds)
        .in("categoria", ["terceirizado", "carga_propria"]);
      if (error) throw error;

      const grouped = new Map<string, MovRow[]>();
      for (const row of (data ?? []) as (MovRow & { placa?: string | null })[]) {
        if (!row.carga_id) continue;
        const dataCarga = dataByCarga.get(row.carga_id);
        // Janela operacional ampliada: de 12h antes até 48h depois da data
        // da carga. Isso cobre cargas que entram tarde da noite e saem na
        // madrugada do dia seguinte, sem deixar ciclos antigos vazarem.
        if (dataCarga && row.data_hora) {
          const base = new Date(`${dataCarga}T00:00:00`).getTime();
          const inicio = base - 12 * 3600_000;
          const fim = base + 48 * 3600_000;
          const ts = new Date(row.data_hora).getTime();
          if (Number.isFinite(ts) && (ts < inicio || ts >= fim)) continue;
        }
        // Se a carga tem placa esperada e o movimento tem placa, exigimos match.
        const placaRef = placaByCarga.get(row.carga_id);
        if (placaRef && row.placa && row.placa.trim().toUpperCase() !== placaRef) continue;
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
    let attempts = 0;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const connect = () => {
      channel = supabase
        .channel(`status-portaria-${idsKey}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "movimentacoes_portaria" },
          () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
            debounceRef.current = setTimeout(() => {
              queryClient.invalidateQueries({ queryKey: ["status_portaria_por_carga", idsKey] });
            }, 1500);
          }
        )
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            attempts = 0;
          } else if (status === "CHANNEL_ERROR" || status === "CLOSED" || status === "TIMED_OUT") {
            // Reconexão com backoff (3s, 10s, 30s, 60s)
            const delay = Math.min(60_000, 3_000 * Math.pow(2, attempts));
            attempts += 1;
            if (channel) supabase.removeChannel(channel);
            channel = null;
            reconnectTimer = setTimeout(connect, delay);
          }
        });
    };
    connect();

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (channel) supabase.removeChannel(channel);
    };
  }, [idsKey, session, cargaIds.length, queryClient]);

  return query;
}

export const ETAPA_PORTARIA_ORDEM = ORDEM;
export const ETAPA_PORTARIA_LABELS = LABELS;