import React, { useState, useMemo, useCallback, useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { CalendarIcon, Weight, Package, ChevronDown, ChevronRight, Printer, AlertTriangle, Pencil, FileText, CheckCircle2, Hourglass, FileSpreadsheet } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { SortableTableHead } from "@/components/ui/sortable-table-head";
import { useSortableTable } from "@/hooks/useSortableTable";
import { ConsolidadoPrintDialog, type ConsolidadoPrintData } from "@/components/dashboard/ConsolidadoPrintDialog";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchAllPaginated } from "@/lib/supabase-paginate";
import { cn } from "@/lib/utils";
import { STATUSES, STATUS_COLORS } from "@/lib/constants";
import { StatusSelect } from "@/components/dashboard/StatusSelect";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "sonner";
import type { Carregamento } from "@/hooks/useCarregamentos";
import { EditarCargaDialog } from "@/components/dashboard/EditarCargaDialog";
import { pesoEfetivo, isRupturaParcial, pesoNaoCarregado, quantidadeNaoCarregada } from "@/lib/peso-utils";
import { temRuptura } from "@/lib/ruptura-utils";
import { CargaPrintDialog, type CargaPrintData } from "@/components/dashboard/CargaPrintDialog";
import { useStatusPortariaPorCarga, makeStatusKey, ETAPA_PORTARIA_ORDEM, ETAPA_PORTARIA_LABELS, type EtapaPortaria } from "@/hooks/useStatusPortariaPorCarga";
import { PortariaStatusBadge } from "@/components/dashboard/PortariaStatusBadge";
import { computeDataEfetivaTerceirizada } from "@/lib/data-efetiva";
import { exportConsolidadoXLSX } from "@/lib/consolidado-export";

function getToday() {
  return new Date().toISOString().split("T")[0];
}

function getInitialDate() {
  const params = new URLSearchParams(window.location.search);
  return params.get("data") || getToday();
}

function useConsolidado(dateFrom: string, dateTo?: string, ordemCarga?: string) {
  const dateEnd = dateTo || dateFrom;
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["consolidado", dateFrom, dateEnd, ordemCarga ?? ""],
    queryFn: async () => {
      // Modo busca por nº de ordem de carga: ignora o intervalo de datas
      // e procura nos últimos 365 dias por ordem_carga.
      if (ordemCarga && ordemCarga.trim().length > 0) {
        const term = ordemCarga.trim();
        const yearAgo = new Date();
        yearAgo.setDate(yearAgo.getDate() - 365);
        const limitDate = yearAgo.toISOString().split("T")[0];
        const data = await fetchAllPaginated<any>((from, to) =>
          supabase
            .from("carregamentos_dia")
            .select("*, vendedores(nome_vendedor)")
            .not("carga_id", "is", null)
            .neq("etapa", "pre_carga")
            .gte("data", limitDate)
            .ilike("ordem_carga", `%${term}%`)
            .order("data", { ascending: false })
            .order("carga_id", { ascending: true })
            .order("id", { ascending: true })
            .range(from, to),
        );
        return (data ?? []) as Carregamento[];
      }
      const todayStr = new Date().toISOString().split("T")[0];
      const isSingleDay = dateFrom === dateEnd;
      // Paginação completa para nunca truncar pedidos da consolidada.
      const data = await fetchAllPaginated<any>((from, to) => {
        let q = supabase
          .from("carregamentos_dia")
          .select("*, vendedores(nome_vendedor)")
          .not("carga_id", "is", null)
          .neq("etapa", "pre_carga");
        if (isSingleDay && dateFrom === todayStr) {
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          const limitDate = thirtyDaysAgo.toISOString().split("T")[0];
          q = q.or(`data.eq.${dateFrom},and(data.lt.${dateFrom},data.gte.${limitDate},status.neq.Carregado)`);
        } else if (isSingleDay) {
          q = q.eq("data", dateFrom);
        } else {
          q = q.gte("data", dateFrom).lte("data", dateEnd);
        }
        return q
          .order("carga_id", { ascending: true })
          .order("id", { ascending: true })
          .range(from, to);
      });
      let rows = (data ?? []) as Carregamento[];

      // Carry-over adicional: quando estamos vendo "hoje" (single-day),
      // também trazer cargas com data < hoje cuja operação física aconteceu
      // hoje (movimento de portaria registrado hoje), mesmo se status = Carregado.
      // Isto evita que marcar "Carregado" no dia seguinte faça a carga sumir da tela.
      if (isSingleDay && dateFrom === todayStr) {
        const startOfDay = `${dateFrom}T00:00:00`;
        const endOfDay = `${dateFrom}T23:59:59.999`;
        const { data: movsHoje } = await supabase
          .from("movimentacoes_portaria")
          .select("carga_id")
          .not("carga_id", "is", null)
          .gte("data_hora", startOfDay)
          .lte("data_hora", endOfDay);
        const cargaIdsHoje = Array.from(
          new Set(((movsHoje ?? []) as { carga_id: string | null }[])
            .map((m) => m.carga_id)
            .filter((v): v is string => !!v))
        );
        const jaPresentes = new Set(rows.map((r) => r.carga_id).filter(Boolean) as string[]);
        const faltantes = cargaIdsHoje.filter((cid) => !jaPresentes.has(cid));
        if (faltantes.length > 0) {
          const extra = await fetchAllPaginated<any>((from, to) =>
            supabase
              .from("carregamentos_dia")
              .select("*, vendedores(nome_vendedor)")
              .in("carga_id", faltantes)
              .neq("etapa", "pre_carga")
              .lt("data", dateFrom)
              .order("id", { ascending: true })
              .range(from, to),
          );
          if (extra && extra.length > 0) {
            rows = [...rows, ...(extra as Carregamento[])];
          }
        }
      }

      // === Data efetiva (terceirizadas) ===
      // Trazer também cargas TERCEIRIZADAS cuja data original está fora do
      // intervalo, mas cuja saída pela portaria caiu dentro do intervalo.
      // Assim "Fernando" (chegou ontem, saiu hoje) aparece em "hoje".
      {
        const startRange = `${dateFrom}T00:00:00`;
        const endRange = `${dateEnd}T23:59:59.999`;
        const { data: saidasNoIntervalo } = await supabase
          .from("movimentacoes_portaria")
          .select("carga_id")
          .eq("categoria", "terceirizado")
          .not("carga_id", "is", null)
          .not("horario_saida_final", "is", null)
          .gte("horario_saida_final", startRange)
          .lte("horario_saida_final", endRange);
        const cargaIdsSaida = Array.from(
          new Set(((saidasNoIntervalo ?? []) as { carga_id: string | null }[])
            .map((m) => m.carga_id)
            .filter((v): v is string => !!v))
        );
        const jaPresentes2 = new Set(rows.map((r) => r.carga_id).filter(Boolean) as string[]);
        const faltantesSaida = cargaIdsSaida.filter((cid) => !jaPresentes2.has(cid));
        if (faltantesSaida.length > 0) {
          const extraSaida = await fetchAllPaginated<any>((from, to) =>
            supabase
              .from("carregamentos_dia")
              .select("*, vendedores(nome_vendedor)")
              .in("carga_id", faltantesSaida)
              .neq("etapa", "pre_carga")
              .lt("data", dateFrom)
              .order("id", { ascending: true })
              .range(from, to),
          );
          if (extraSaida && extraSaida.length > 0) {
            rows = [...rows, ...(extraSaida as Carregamento[])];
          }
        }
      }

      // === Carry-over de terceirizadas paradas no pátio ===
      // Quando estamos vendo "hoje", trazer também cargas terceirizadas que
      // já entraram no pátio (horario_entrada NOT NULL) mas ainda não saíram
      // (horario_saida_final NULL). Sem isso, cargas com data original
      // anterior e status=Carregado somem da tela, mesmo continuando no pátio.
      // computeDataEfetivaTerceirizada já desloca a data para hoje quando
      // saida=null, então o grupo aparece naturalmente no dia atual.
      // Carry-over de pátio aplica-se sempre que o intervalo selecionado
      // inclui "hoje" — single-day hoje OU range que cobre hoje (ex.: 22–23).
      if (dateFrom <= todayStr && todayStr <= dateEnd) {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const janelaEntrada = sevenDaysAgo.toISOString();
        const [{ data: noPatio }, { data: jaFinalizadas }] = await Promise.all([
          supabase
            .from("movimentacoes_portaria")
            .select("carga_id")
            .eq("categoria", "terceirizado")
            .not("carga_id", "is", null)
            .not("horario_entrada", "is", null)
            .is("horario_saida_final", null)
            .gte("horario_entrada", janelaEntrada),
          supabase
            .from("movimentacoes_portaria")
            .select("carga_id")
            .eq("categoria", "terceirizado")
            .not("carga_id", "is", null)
            .not("horario_saida_final", "is", null)
            .gte("horario_saida_final", janelaEntrada),
        ]);
        // Remove carga_ids que já tiveram uma viagem encerrada na janela —
        // o "no pátio" sobrou de uma viagem antiga (mesmo nome de carga
        // reutilizado em placa diferente). Sem isso, cargas já expedidas
        // reaparecem em "hoje" via carry-over.
        const finalizadasSet = new Set(
          ((jaFinalizadas ?? []) as { carga_id: string | null }[])
            .map((m) => m.carga_id)
            .filter((v): v is string => !!v),
        );
        const cargaIdsPatio = Array.from(
          new Set(((noPatio ?? []) as { carga_id: string | null }[])
            .map((m) => m.carga_id)
            .filter((v): v is string => !!v && !finalizadasSet.has(v)))
        );
        const jaPresentes3 = new Set(rows.map((r) => r.carga_id).filter(Boolean) as string[]);
        const faltantesPatio = cargaIdsPatio.filter((cid) => !jaPresentes3.has(cid));
        if (faltantesPatio.length > 0) {
          const extraPatio = await fetchAllPaginated<any>((from, to) =>
            supabase
              .from("carregamentos_dia")
              .select("*, vendedores(nome_vendedor)")
              .in("carga_id", faltantesPatio)
              .neq("etapa", "pre_carga")
              .lt("data", todayStr)
              .order("id", { ascending: true })
              .range(from, to),
          );
          if (extraPatio && extraPatio.length > 0) {
            rows = [...rows, ...(extraPatio as Carregamento[])];
          }
        }
      }

      return rows;
    },
    staleTime: 15_000,
  });

  // Realtime: invalida ao mudar carregamentos OU saídas da portaria (data efetiva)
  useEffect(() => {
    const channel = supabase
      .channel(`consolidado-${dateFrom}-${dateEnd}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "carregamentos_dia" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["consolidado", dateFrom, dateEnd] });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "movimentacoes_portaria" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["consolidado", dateFrom, dateEnd] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [dateFrom, dateEnd, queryClient]);

  return query;
}

interface CargaGroup {
  cargaId: string;
  nomeCarga: string | null;
  ordemCarga: string | null;
  placa: string | null;
  motorista: string | null;
  tipoCaminhao: string | null;
  tipoFrete: string;
  /** Peso fisicamente embarcado (desconsidera ruptura). */
  pesoTotal: number;
  /** Peso planejado original (inclui ruptura). */
  pesoPlanejado: number;
  qtdPedidos: number;
  rupturaCount: number;
  parcialCount: number;
  pesoCortado: number;
  clientes: Set<string>;
  ufs: Set<string>;
  status: string;
  data: string;
  horarioPrevisto: string | null;
  items: Carregamento[];
}

function groupByCarga(data: Carregamento[]): CargaGroup[] {
  const map = new Map<string, CargaGroup>();
  const freteMap = new Map<string, Set<string>>();
  for (const item of data) {
    if (!item.carga_id) continue;
    // Chave composta: carga_id + data + placa. O mesmo nome de carga
    // (`carga_id`) é reutilizado em viagens diferentes — sem essa chave
    // composta, duas viagens distintas com o mesmo nome eram fundidas e o
    // peso aparecia somado (ex.: "CF FRANGO" Raimundo + Toni).
    const groupKey = `${item.carga_id}__${item.data ?? ""}__${item.placa ?? ""}`;
    let g = map.get(groupKey);
    if (!g) {
      g = {
        cargaId: item.carga_id,
        nomeCarga: item.nome_carga ?? null,
        ordemCarga: (item as any).ordem_carga ?? null,
        placa: item.placa,
        motorista: item.motorista,
        tipoCaminhao: item.tipo_caminhao,
        tipoFrete: "",
        pesoTotal: 0,
        pesoPlanejado: 0,
        qtdPedidos: 0,
        rupturaCount: 0,
        parcialCount: 0,
        pesoCortado: 0,
        clientes: new Set(),
        ufs: new Set(),
        status: item.status,
        data: item.data,
        horarioPrevisto: item.horario_previsto ?? null,
        items: [],
      };
      map.set(groupKey, g);
      freteMap.set(groupKey, new Set());
    }
    if (!g.horarioPrevisto && item.horario_previsto) g.horarioPrevisto = item.horario_previsto;
    g.pesoPlanejado += item.peso ?? 0;
    g.pesoTotal += pesoEfetivo({ peso: item.peso, ruptura: !!item.ruptura });
    if (item.ruptura) g.rupturaCount += 1;
    if (isRupturaParcial(item)) {
      g.parcialCount += 1;
      g.pesoCortado += pesoNaoCarregado(item);
    }
    if (item.codigo_cliente) g.clientes.add(item.codigo_cliente);
    if (item.uf) g.ufs.add(item.uf);
    if (item.tipo_frete) freteMap.get(groupKey)!.add(item.tipo_frete);
    g.items.push(item);
  }
  for (const [cargaId, g] of map.entries()) {
    g.qtdPedidos = g.items.length;
    const fretes = freteMap.get(cargaId)!;
    g.tipoFrete = fretes.size > 0 ? [...fretes].sort().join(" / ") : "—";
  }
  return Array.from(map.values());
}

export default function Consolidado() {
  const navigate = useNavigate();
  const today = new Date();
  const [dateRange, setDateRange] = useState<DateRange>({ from: today, to: today });
  const dateFromStr = dateRange.from ? format(dateRange.from, "yyyy-MM-dd") : getToday();
  const dateToStr = dateRange.to ? format(dateRange.to, "yyyy-MM-dd") : dateFromStr;
  const [filterUf, setFilterUf] = useState("todos");
  const [filterStatus, setFilterStatus] = useState("todos");
  const [filterEtapaPortaria, setFilterEtapaPortaria] = useState<"todas" | EtapaPortaria>("todas");
  const [searchOC, setSearchOC] = useState("");
  const [debouncedOC, setDebouncedOC] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedOC(searchOC.trim()), 300);
    return () => clearTimeout(t);
  }, [searchOC]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [printOpen, setPrintOpen] = useState(false);
  const [romaneioData, setRomaneioData] = useState<CargaPrintData | null>(null);
  const [romaneioOpen, setRomaneioOpen] = useState(false);
  const [editGroup, setEditGroup] = useState<CargaGroup | null>(null);
  const { sort, toggleSort, sortData } = useSortableTable();
  const isMobile = useIsMobile();

  const queryClient = useQueryClient();
  const { data: rawData, isLoading } = useConsolidado(dateFromStr, dateToStr, debouncedOC || undefined);

  const updateStatusMut = useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: string }) => {
      const { error } = await supabase
        .from("carregamentos_dia")
        .update({ status })
        .in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["consolidado", dateFromStr, dateToStr] });
      queryClient.invalidateQueries({ queryKey: ["carregamentos"] });
      toast.success("Status atualizado");
    },
    onError: () => toast.error("Erro ao atualizar status"),
  });

  const updateDateMut = useMutation({
    mutationFn: async ({ cargaId, newDate }: { cargaId: string; newDate: string }) => {
      const { error } = await supabase
        .from("carregamentos_dia")
        .update({ data: newDate })
        .eq("carga_id", cargaId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["consolidado"] });
      queryClient.invalidateQueries({ queryKey: ["carregamentos"] });
      toast.success("Data da carga atualizada");
    },
    onError: () => toast.error("Erro ao atualizar data"),
  });

  const editCargaMut = useMutation({
    mutationFn: async ({ cargaId, fields, itemUpdates, ordemUpdates }: { cargaId: string; fields: Record<string, string>; itemUpdates?: Record<string, { peso?: number; quantidade?: number; motivo_ruptura?: string | null }>; ordemUpdates?: Record<string, number> }) => {
      if (!cargaId) return;
      // Cascade: propaga para TODOS os itens da carga (mesmo carga_id),
      // garantindo que cargas fechadas sejam atualizadas em todos os lugares.
      const { error } = await supabase
        .from("carregamentos_dia")
        .update(fields)
        .eq("carga_id", cargaId);
      if (error) throw error;
      // Updates por item (peso reduzido = ruptura parcial, motivo opcional)
      if (itemUpdates) {
        const entries = Object.entries(itemUpdates).filter(([, v]) => v.peso !== undefined || v.quantidade !== undefined || v.motivo_ruptura !== undefined);
        if (entries.length > 0) {
          await Promise.all(
            entries.map(([id, v]) => {
              const payload: Record<string, any> = {};
              if (v.peso !== undefined) { payload.peso = v.peso; payload.peso_manual = true; }
              if (v.quantidade !== undefined) { payload.quantidade = v.quantidade; payload.peso_manual = true; }
              if (v.motivo_ruptura !== undefined) payload.motivo_ruptura = v.motivo_ruptura;
              return supabase.from("carregamentos_dia").update(payload).eq("id", id);
            })
          );
        }
      }
      // Updates de ordem_entrega por item (reordenação manual de paradas)
      if (ordemUpdates) {
        const entries = Object.entries(ordemUpdates);
        if (entries.length > 0) {
          await Promise.all(
            entries.map(([id, ordem]) =>
              supabase.from("carregamentos_dia").update({ ordem_entrega: ordem }).eq("id", id)
            )
          );
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["consolidado"] });
      queryClient.invalidateQueries({ queryKey: ["carregamentos"] });
      toast.success("Carga atualizada");
      setEditGroup(null);
    },
    onError: () => toast.error("Erro ao atualizar carga"),
  });

  const deleteCargaMut = useMutation({
    mutationFn: async (cargaId: string) => {
      const { error, count } = await supabase
        .from("carregamentos_dia")
        .update({
          etapa: "vendas",
          status: "Aguardando",
          carga_id: null,
          nome_carga: null,
          placa: null,
          motorista: null,
          tipo_caminhao: null,
          transportadora: null,
          ordem_entrega: null,
          horario_inicio: null,
          horario_fim: null,
        }, { count: "exact" })
        .eq("carga_id", cargaId);
      if (error) throw error;
      if (count === 0) throw new Error("Sem permissão. Apenas administradores e logística podem desfazer cargas.");
      return count ?? 0;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["consolidado"] });
      queryClient.invalidateQueries({ queryKey: ["carregamentos"] });
      toast.success(`Carga desfeita — ${count} pedido${count !== 1 ? "s" : ""} voltaram para Vendas`);
      setEditGroup(null);
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao desfazer carga"),
  });

  const removeFromCargaMut = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase
        .from("carregamentos_dia")
        .update({ carga_id: null, nome_carga: null, etapa: "vendas" })
        .eq("id", itemId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["consolidado"] });
      queryClient.invalidateQueries({ queryKey: ["carregamentos"] });
      toast.success("Pedido removido da carga");
    },
    onError: () => toast.error("Erro ao remover pedido"),
  });

  const inverterOrdemMut = useMutation({
    mutationFn: async (items: Carregamento[]) => {
      const paradas = [...new Set(items.map((i) => i.ordem_entrega).filter((o): o is number => o != null))].sort((a, b) => a - b);
      if (paradas.length < 2) {
        return { count: paradas.length };
      }
      const map = new Map(paradas.map((ord, idx) => [ord, paradas[paradas.length - 1 - idx]]));
      const updates = items
        .filter((i) => i.ordem_entrega != null)
        .map((i) => ({ id: i.id, ordem_entrega: map.get(i.ordem_entrega as number)! }));
      await Promise.all(
        updates.map((u) =>
          supabase.from("carregamentos_dia").update({ ordem_entrega: u.ordem_entrega }).eq("id", u.id)
        )
      );
      return { count: paradas.length };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["consolidado"] });
      queryClient.invalidateQueries({ queryKey: ["carregamentos"] });
      if (!result || result.count < 2) {
        toast.info("Nada a inverter — a carga precisa ter ao menos 2 paradas roteirizadas");
      } else {
        toast.success(`Ordem de entrega invertida (${result.count} paradas)`);
      }
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao inverter ordem"),
  });

  const handleStatusChange = useCallback(
    (group: CargaGroup, newStatus: string) => {
      const ids = group.items.map((i) => i.id);
      updateStatusMut.mutate({ ids, status: newStatus });
    },
    [updateStatusMut]
  );

  const handleDateChange = useCallback(
    (group: CargaGroup, newDate: Date) => {
      const formatted = format(newDate, "yyyy-MM-dd");
      if (formatted !== group.data) {
        updateDateMut.mutate({ cargaId: group.cargaId, newDate: formatted });
      }
    },
    [updateDateMut]
  );

  const handleOpenRomaneio = useCallback((group: CargaGroup) => {
    // Group items by client, sort by ordem_entrega; same shape as fechamento.
    const clienteMap = new Map<string, {
      codigoCliente: string | null;
      nomeCliente: string | null;
      cidade: string | null;
      uf: string | null;
      formaPagamento: string | null;
      items: { id: string; nomeProduto: string | null; peso: number; ruptura?: boolean; pesoOriginal?: number | null }[];
      pesoTotal: number;
      rupturaCount: number;
      ordem: number;
      ordemCarga: string | null;
    }>();
    for (const item of group.items) {
      const key = item.codigo_cliente ?? `__sem__${item.cliente ?? "—"}`;
      let c = clienteMap.get(key);
      if (!c) {
        c = {
          codigoCliente: item.codigo_cliente,
          nomeCliente: item.cliente ?? null,
          cidade: (item as any).cidade ?? null,
          uf: (item as any).uf ?? null,
          formaPagamento: (item as any).forma_pagamento ?? null,
          items: [],
          pesoTotal: 0,
          rupturaCount: 0,
          ordem: item.ordem_entrega ?? 9999,
          ordemCarga: null,
        };
        clienteMap.set(key, c);
      }
      c.items.push({
        id: item.id,
        nomeProduto: item.nome_produto ?? item.codigo_produto ?? null,
        peso: item.peso ?? 0,
        ruptura: !!item.ruptura,
        pesoOriginal: item.peso_original ?? null,
      });
      c.pesoTotal += pesoEfetivo({ peso: item.peso, ruptura: !!item.ruptura });
      if (item.ruptura) c.rupturaCount += 1;
      // ordem: pega o menor ordem_entrega não-nulo do grupo
      if (item.ordem_entrega != null && item.ordem_entrega < c.ordem) {
        c.ordem = item.ordem_entrega;
      }
    }
    const groupsArr = Array.from(clienteMap.values()).sort((a, b) => a.ordem - b.ordem);
    // Renumera ordens sequenciais (1..N) garantindo continuidade
    groupsArr.forEach((g, idx) => { g.ordem = idx + 1; });
    // Coleta OCs distintas por cliente
    {
      const ocMap = new Map<string, Set<string>>();
      for (const item of group.items) {
        const key = item.codigo_cliente ?? `__sem__${item.cliente ?? "—"}`;
        const oc = ((item as any).ordem_carga ?? "").toString().trim();
        if (!oc) continue;
        if (!ocMap.has(key)) ocMap.set(key, new Set());
        ocMap.get(key)!.add(oc);
      }
      for (const g of groupsArr) {
        const key = g.codigoCliente ?? `__sem__${g.nomeCliente ?? "—"}`;
        const set = ocMap.get(key);
        g.ordemCarga = set && set.size > 0 ? Array.from(set).join("/") : null;
      }
    }

    const totalPeso = groupsArr.reduce((s, g) => s + g.pesoTotal, 0);
    const totalRuptura = group.items
      .filter((i) => i.ruptura)
      .reduce((s, i) => s + (i.peso ?? 0), 0);
    const totalCortado = group.items.reduce(
      (s, i) => s + (isRupturaParcial(i) ? pesoNaoCarregado(i) : 0),
      0,
    );

    const data: CargaPrintData = {
      cargaId: group.nomeCarga ?? group.cargaId,
      data: group.data,
      tipoCaminhao: group.tipoCaminhao ?? "—",
      placa: group.placa ?? "—",
      motorista: group.motorista ?? "—",
      transportadora: group.items[0]?.transportadora ?? undefined,
      horarioPrevisto: group.items[0]?.horario_previsto ?? undefined,
      tipoFrete: group.tipoFrete ?? undefined,
      nomeCarga: group.nomeCarga ?? null,
      groups: groupsArr,
      totalPeso,
      totalRuptura,
      totalCortado,
      totalPedidos: group.qtdPedidos,
    };
    setRomaneioData(data);
    setRomaneioOpen(true);
  }, []);

  const filtered = useMemo(() => {
    if (!rawData) return [];
    return rawData.filter((c) => {
      if (filterUf !== "todos" && c.uf !== filterUf) return false;
      if (filterStatus !== "todos" && c.status !== filterStatus) return false;
      return true;
    });
  }, [rawData, filterUf, filterStatus]);

  const rawGroupsBruto = useMemo(() => groupByCarga(filtered), [filtered]);

  // Status da Portaria (terceirizados) por carga — passa também a data para
  // evitar que cargas homônimas em datas diferentes se misturem no status.
  const cargaIds = useMemo(
    () => rawGroupsBruto.map((g) => ({ carga_id: g.cargaId, data: g.data, placa: g.placa })),
    [rawGroupsBruto]
  );
  const { data: statusPortariaMap } = useStatusPortariaPorCarga(cargaIds);
  const getStatusPortaria = useCallback(
    (cargaId: string, placa?: string | null) =>
      statusPortariaMap?.get(makeStatusKey(cargaId, placa)),
    [statusPortariaMap],
  );

  // === Data efetiva (terceirizadas) ===
  // Sobrescreve g.data pela data da saída da portaria / finalização no
  // faturamento. Em seguida, filtra apenas grupos cuja data efetiva caia
  // dentro do intervalo selecionado. Cargas próprias mantêm a data original.
  const rawGroups = useMemo(() => {
    const out: CargaGroup[] = [];
    const todayStr = new Date().toISOString().slice(0, 10);
    for (const g of rawGroupsBruto) {
      const saida = statusPortariaMap?.get(makeStatusKey(g.cargaId, g.placa))?.saida ?? null;
      const dataEfetiva = computeDataEfetivaTerceirizada(g.items, g.data, saida, todayStr);
      // Em modo busca por nº de OC, ignoramos o filtro de intervalo de datas.
      const isWithin = !!debouncedOC || (dataEfetiva >= dateFromStr && dataEfetiva <= dateToStr);
      if (!isWithin) continue;
      if (dataEfetiva !== g.data) {
        out.push({ ...g, data: dataEfetiva });
      } else {
        out.push(g);
      }
    }
    return out;
  }, [rawGroupsBruto, statusPortariaMap, dateFromStr, dateToStr, debouncedOC]);

  const groupsWithPortariaFilter = useMemo(() => {
    if (filterEtapaPortaria === "todas") return rawGroups;
    return rawGroups.filter((g) => {
      const info = statusPortariaMap?.get(makeStatusKey(g.cargaId, g.placa));
      const etapa = info?.etapa ?? "aguardando";
      return etapa === filterEtapaPortaria;
    });
  }, [rawGroups, statusPortariaMap, filterEtapaPortaria]);

  const consolidadoAccessors: Record<string, (g: CargaGroup) => any> = useMemo(() => ({
    data: (g) => g.data,
    status: (g) => g.status,
    nomeCarga: (g) => g.nomeCarga ?? "",
    tipoCaminhao: (g) => g.tipoCaminhao ?? "",
    placa: (g) => g.placa ?? "",
    motorista: (g) => g.motorista ?? "",
    pesoTotal: (g) => g.pesoTotal,
    qtdPedidos: (g) => g.qtdPedidos,
    rupturaCount: (g) => g.rupturaCount,
    horarioPrevisto: (g) => g.horarioPrevisto ?? "99:99",
    clientes: (g) => g.clientes.size,
    ufs: (g) => [...g.ufs].sort().join(", "),
    tipoFrete: (g) => g.tipoFrete,
    portaria: (g) => ETAPA_PORTARIA_ORDEM[(statusPortariaMap?.get(makeStatusKey(g.cargaId, g.placa))?.etapa ?? "aguardando") as EtapaPortaria],
  }), [statusPortariaMap]);

  const groups = useMemo(() => sortData(groupsWithPortariaFilter, consolidadoAccessors), [groupsWithPortariaFilter, sortData, consolidadoAccessors]);

  // === Consolidado de Rupturas ===
  const rupturaPorCarga = useMemo(() => {
    const out: Array<{
      cargaId: string;
      nomeCarga: string | null;
      clientes: string;
      pesoPlanejado: number;
      pesoRuptura: number;
      qtdRuptura: number;
      itensRuptura: number;
      pctRuptura: number;
    }> = [];
    for (const g of groups) {
      let pesoPlan = 0;
      let pesoRup = 0;
      let qtdRup = 0;
      let itens = 0;
      const clientesSet = new Set<string>();
      for (const it of g.items) {
        pesoPlan += Number(it.peso_original ?? it.peso ?? 0);
        if (temRuptura(it)) {
          pesoRup += pesoNaoCarregado(it);
          qtdRup += quantidadeNaoCarregada(it);
          itens += 1;
          if (it.cliente) clientesSet.add(it.cliente);
        }
      }
      if (itens === 0) continue;
      const clientesArr = [...clientesSet];
      const clientesLabel = clientesArr.length <= 2
        ? clientesArr.join(", ")
        : `${clientesArr.slice(0, 2).join(", ")} +${clientesArr.length - 2}`;
      out.push({
        cargaId: g.cargaId,
        nomeCarga: g.nomeCarga,
        clientes: clientesLabel || "—",
        pesoPlanejado: pesoPlan,
        pesoRuptura: pesoRup,
        qtdRuptura: qtdRup,
        itensRuptura: itens,
        pctRuptura: pesoPlan > 0 ? (pesoRup / pesoPlan) * 100 : 0,
      });
    }
    return out.sort((a, b) => b.pctRuptura - a.pctRuptura);
  }, [groups]);

  const rupturaPorItem = useMemo(() => {
    const map = new Map<string, {
      codigo: string;
      nome: string;
      kg: number;
      unid: number;
      cargas: Set<string>;
      pedidos: Set<string>;
    }>();
    for (const g of groups) {
      for (const it of g.items) {
        if (!temRuptura(it)) continue;
        const key = it.codigo_produto || it.nome_produto || "—";
        let row = map.get(key);
        if (!row) {
          row = {
            codigo: it.codigo_produto || "—",
            nome: it.nome_produto || "—",
            kg: 0,
            unid: 0,
            cargas: new Set(),
            pedidos: new Set(),
          };
          map.set(key, row);
        }
        row.kg += pesoNaoCarregado(it);
        row.unid += quantidadeNaoCarregada(it);
        if (g.cargaId) row.cargas.add(g.cargaId);
        if (it.numero_pedido != null) row.pedidos.add(String(it.numero_pedido));
      }
    }
    return Array.from(map.values()).sort((a, b) => b.kg - a.kg);
  }, [groups]);

  const rupturaTotais = useMemo(() => {
    return rupturaPorItem.reduce(
      (acc, r) => ({ kg: acc.kg + r.kg, unid: acc.unid + r.unid, itens: acc.itens + 1 }),
      { kg: 0, unid: 0, itens: 0 },
    );
  }, [rupturaPorItem]);

  // Keep the open edit dialog in sync with the latest data (e.g. after inverting order)
  useEffect(() => {
    if (!editGroup) return;
    const fresh = rawGroups.find((g) => g.cargaId === editGroup.cargaId);
    if (fresh && fresh !== editGroup) {
      setEditGroup(fresh);
    }
  }, [rawGroups, editGroup]);

  const totalVeiculos = groups.length;
  const pesoTotal = groups.reduce((s, g) => s + g.pesoTotal, 0);
  const totalPedidos = groups.reduce((s, g) => s + g.qtdPedidos, 0);

  // KPIs de Portaria (sobre os grupos visíveis)
  const portariaCounts = useMemo(() => {
    const c = { patio: 0, carregando: 0, expedido: 0, pesoCarregando: 0, pesoExpedido: 0 };
    for (const g of groups) {
      const etapa = statusPortariaMap?.get(makeStatusKey(g.cargaId, g.placa))?.etapa ?? "aguardando";
      const temItemCarregando = g.items.some((it) => it.status === "Carregando");
      if (etapa === "patio" || etapa === "carregando") c.patio += 1;
      if (etapa === "carregando" || temItemCarregando) {
        c.carregando += 1;
        c.pesoCarregando += g.pesoTotal;
      }
      if (etapa === "expedido") {
        c.expedido += 1;
        c.pesoExpedido += g.pesoTotal;
      }
    }
    return c;
  }, [groups, statusPortariaMap]);

  const tipoBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    for (const g of groups) {
      const t = g.tipoCaminhao || "Não definido";
      map.set(t, (map.get(t) || 0) + 1);
    }
    return Array.from(map.entries()).map(([name, count]) => `${count} ${name}`).join(", ") || "—";
  }, [groups]);

  const printData = useMemo<ConsolidadoPrintData | null>(() => {
    if (groups.length === 0) return null;
    return {
      data: dateFromStr === dateToStr ? dateFromStr : `${dateFromStr} a ${dateToStr}`,
      groups: groups.map((g) => ({
        cargaId: g.cargaId,
        tipoCaminhao: g.tipoCaminhao,
        placa: g.placa,
        motorista: g.motorista,
        transportadora: g.items[0]?.transportadora ?? null,
        tipoFrete: g.tipoFrete,
        status: g.status,
        pesoTotal: g.pesoTotal,
        pesoPlanejado: g.pesoPlanejado,
        qtdPedidos: g.qtdPedidos,
        qtdClientes: g.clientes.size,
        ufs: [...g.ufs].sort().join(", ") || "—",
      })),
      totalVeiculos,
      totalPeso: pesoTotal,
      totalPedidos,
    };
  }, [groups, dateFromStr, dateToStr, totalVeiculos, pesoTotal, totalPedidos]);

  const ufOptions = useMemo(() => {
    if (!rawData) return [];
    const ufs = [...new Set(rawData.map((c) => c.uf).filter(Boolean))] as string[];
    return ufs.sort();
  }, [rawData]);

  const toggleExpand = (cargaId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(cargaId)) next.delete(cargaId);
      else next.add(cargaId);
      return next;
    });
  };

  const pesoFaltante = Math.max(0, pesoTotal - portariaCounts.pesoCarregando - portariaCounts.pesoExpedido);
  const kpis: Array<{ label: string; value: string | number; sub?: string; icon: any; color: string }> = [
    {
      label: "Peso Total",
      value: `${pesoTotal.toLocaleString("pt-BR")} kg`,
      sub: `${totalVeiculos} ${totalVeiculos === 1 ? "veículo" : "veículos"}`,
      icon: Weight,
      color: "text-foreground",
    },
    {
      label: "Peso a Carregar",
      value: `${pesoFaltante.toLocaleString("pt-BR")} kg`,
      icon: Hourglass,
      color: "text-amber-600 dark:text-amber-400",
    },
    {
      label: "Carregando",
      value: `${portariaCounts.pesoCarregando.toLocaleString("pt-BR")} kg`,
      sub: `${portariaCounts.carregando} ${portariaCounts.carregando === 1 ? "carro" : "carros"}`,
      icon: Package,
      color: "text-amber-600 dark:text-amber-400",
    },
    {
      label: "Expedidos",
      value: `${portariaCounts.pesoExpedido.toLocaleString("pt-BR")} kg`,
      sub: `${portariaCounts.expedido} ${portariaCounts.expedido === 1 ? "carro" : "carros"}`,
      icon: CheckCircle2,
      color: "text-emerald-600 dark:text-emerald-400",
    },
  ];

  return (
    <Layout>
      <div className="p-4 sm:p-6 space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 min-w-0">
            <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="text-xs shrink-0">← Painel</Button>
            <h1 className="text-base sm:text-lg font-bold tracking-tight truncate">Consolidado de Cargas</h1>
          </div>
          <div>
            {groups.length > 0 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const etapaMap = new Map<string, string>();
                    for (const g of groups) {
                      const info = statusPortariaMap?.get(makeStatusKey(g.cargaId, g.placa));
                      const etapa = (info?.etapa ?? "aguardando") as EtapaPortaria;
                      etapaMap.set(`${g.cargaId}||${g.placa ?? ""}`, ETAPA_PORTARIA_LABELS[etapa] ?? etapa);
                    }
                    exportConsolidadoXLSX(groups, rawData ?? [], {
                      dateFrom: dateFromStr,
                      dateTo: dateToStr,
                      ordemCarga: debouncedOC || undefined,
                      filtros: {
                        uf: filterUf,
                        status: filterStatus,
                        etapaPortaria: filterEtapaPortaria === "todas" ? undefined : ETAPA_PORTARIA_LABELS[filterEtapaPortaria as EtapaPortaria] ?? filterEtapaPortaria,
                      },
                      etapaPortariaByCarga: etapaMap,
                    });
                    toast.success("Excel exportado");
                  }}
                >
                  <FileSpreadsheet className="h-4 w-4 sm:mr-1" /> <span className="hidden sm:inline">Excel</span>
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPrintOpen(true)}>
                  <Printer className="h-4 w-4 sm:mr-1" /> <span className="hidden sm:inline">Imprimir</span>
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-end gap-2 [&>*]:min-w-0">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("h-10 sm:h-9 text-xs sm:text-sm justify-start gap-2 w-full sm:min-w-[140px] sm:w-auto col-span-2", !dateRange.from && "text-muted-foreground")}>
                <CalendarIcon className="h-4 w-4" />
                {dateRange.from ? (
                  dateRange.to && dateRange.from.getTime() !== dateRange.to.getTime() ? (
                    <>{format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })} – {format(dateRange.to, "dd/MM/yyyy", { locale: ptBR })}</>
                  ) : (
                    format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })
                  )
                ) : (
                  "Selecionar datas"
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto max-w-[95vw] p-0" align="start">
              <Calendar mode="range" selected={dateRange} onSelect={(range) => { if (range) setDateRange(range); }} locale={ptBR} numberOfMonths={2} className={cn("p-3 pointer-events-auto")} />
              <div className="p-2 border-t flex justify-end gap-1">
                <Button variant="ghost" size="sm" className="text-xs" onClick={() => setDateRange({ from: today, to: today })}>Hoje</Button>
                <Button variant="ghost" size="sm" className="text-xs" onClick={() => { const d = new Date(); d.setDate(d.getDate() - 6); setDateRange({ from: d, to: today }); }}>Últimos 7 dias</Button>
                <Button variant="ghost" size="sm" className="text-xs" onClick={() => { const d = new Date(); setDateRange({ from: new Date(d.getFullYear(), d.getMonth(), 1), to: d }); }}>Este mês</Button>
              </div>
            </PopoverContent>
          </Popover>

          <Select value={filterUf} onValueChange={setFilterUf}>
            <SelectTrigger className="h-10 sm:h-9 w-full sm:w-[130px] text-xs sm:text-sm">
              <SelectValue placeholder="UF" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas UFs</SelectItem>
              {ufOptions.map((uf) => (
                <SelectItem key={uf} value={uf}>{uf}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="h-10 sm:h-9 w-full sm:w-[180px] text-xs sm:text-sm">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos status</SelectItem>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterEtapaPortaria} onValueChange={(v) => setFilterEtapaPortaria(v as typeof filterEtapaPortaria)}>
            <SelectTrigger className="h-10 sm:h-9 w-full sm:w-[190px] text-xs sm:text-sm col-span-2 sm:col-auto">
              <SelectValue placeholder="Etapa Portaria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas etapas portaria</SelectItem>
              <SelectItem value="aguardando">{ETAPA_PORTARIA_LABELS.aguardando}</SelectItem>
              <SelectItem value="patio">{ETAPA_PORTARIA_LABELS.patio}</SelectItem>
              <SelectItem value="carregando">{ETAPA_PORTARIA_LABELS.carregando}</SelectItem>
              <SelectItem value="expedido">{ETAPA_PORTARIA_LABELS.expedido}</SelectItem>
            </SelectContent>
          </Select>

          <div className="relative w-full sm:w-[200px] col-span-2 sm:col-auto">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={searchOC}
              onChange={(e) => setSearchOC(e.target.value)}
              placeholder="Buscar nº OC..."
              className="h-10 sm:h-9 pl-7 pr-7 text-xs sm:text-sm"
            />
            {searchOC && (
              <button
                type="button"
                onClick={() => setSearchOC("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Limpar busca"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {debouncedOC && (
          <p className="text-xs text-muted-foreground -mt-1">
            Buscando "{debouncedOC}" em todo o histórico (últimos 365 dias) — filtro de período ignorado.
          </p>
        )}

        {/* KPI Cards */}
        <TooltipProvider delayDuration={300}>
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
            {kpis.map((k) => (
              <Card key={k.label} className="border-border/60">
                <CardContent className="p-3 sm:p-4 flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wide">{k.label}</span>
                    <k.icon className={`h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 ${k.color}`} />
                  </div>
                  <span className="text-sm sm:text-xl font-bold tracking-tight truncate">{k.value}</span>
                  {k.sub && (
                    <span className="text-[10px] sm:text-xs text-muted-foreground font-medium truncate -mt-0.5">{k.sub}</span>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
          {tipoBreakdown !== "—" && (
            <p className="text-xs text-muted-foreground">Distribuição: {tipoBreakdown}</p>
          )}
        </TooltipProvider>

        {/* Content */}
        <Tabs defaultValue="cargas" className="w-full">
          <TabsList>
            <TabsTrigger value="cargas">Cargas</TabsTrigger>
            <TabsTrigger value="rupturas" className="gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5" />
              Rupturas
              {rupturaPorCarga.length > 0 && (
                <span className="ml-1 text-[10px] font-semibold tabular-nums">({rupturaPorCarga.length})</span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="cargas" className="mt-3 space-y-3">
        {isLoading ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Carregando…</p>
        ) : groups.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Nenhuma carga consolidada para este dia.</p>
        ) : isMobile ? (
          /* Mobile Card View */
          <div className="space-y-3">
            {groups.map((g) => {
              const isOpen = expanded.has(g.cargaId);
              const statusColor = STATUS_COLORS[g.status] || "";
              return (
                <Card key={g.cargaId} className="overflow-hidden">
                  <CardContent className="p-0">
                    <div className="p-3 space-y-2 cursor-pointer active:bg-muted/50" onClick={() => toggleExpand(g.cargaId)}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {isOpen ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
                          <span className="font-mono font-bold text-sm">{g.placa ?? "—"}</span>
                          {g.rupturaCount > 0 && (
                            <button
                              onClick={(e) => { e.stopPropagation(); navigate(`/rupturas?carga=${encodeURIComponent(g.nomeCarga || g.cargaId)}`); }}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20 transition-colors"
                            >
                              <AlertTriangle className="h-2.5 w-2.5" />{g.rupturaCount}
                            </button>
                          )}
                        </div>
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleOpenRomaneio(g)} title="Imprimir romaneio">
                            <FileText className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditGroup(g)} title="Editar carga">
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <StatusSelect value={g.status} onChange={(v) => handleStatusChange(g, v)} />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                        <div><span className="text-muted-foreground">Tipo: </span>{g.tipoCaminhao ?? "—"}</div>
                        <div>
                          <span className="text-muted-foreground">Data: </span>
                          {format(new Date(g.data + "T12:00:00"), "dd/MM")}
                          {g.horarioPrevisto && (
                            <span className="ml-1 font-mono text-muted-foreground">· {g.horarioPrevisto.substring(0, 5)}</span>
                          )}
                        </div>
                        <div><span className="text-muted-foreground">Motorista: </span><span className="truncate">{g.motorista ?? "—"}</span></div>
                        <div><span className="text-muted-foreground">Carga: </span><span className="truncate">{g.nomeCarga ?? "—"}</span></div>
                        <div>
                          <span className="text-muted-foreground">Peso: </span>
                          <span className="font-semibold">{g.pesoTotal.toLocaleString("pt-BR")} kg</span>
                          {g.pesoPlanejado > g.pesoTotal && (
                            <span className="ml-1 text-[10px] text-amber-600 dark:text-amber-400" title="Peso planejado / Peso embarcado">
                              (pl. {g.pesoPlanejado.toLocaleString("pt-BR")})
                            </span>
                          )}
                        </div>
                        <div><span className="text-muted-foreground">Pedidos: </span>{g.qtdPedidos}</div>
                        <div><span className="text-muted-foreground">Frete: </span>{g.tipoFrete}</div>
                        <div><span className="text-muted-foreground">UFs: </span>{[...g.ufs].sort().join(", ") || "—"}</div>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-muted-foreground">Portaria:</span>
                        <PortariaStatusBadge info={getStatusPortaria(g.cargaId, g.placa)} />
                      </div>
                      {g.parcialCount > 0 && (
                        <div className="mt-1 text-[11px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/60 rounded px-2 py-1 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3 shrink-0" />
                          ↳ {g.pesoCortado.toLocaleString("pt-BR")} kg cortados em {g.parcialCount} {g.parcialCount === 1 ? "item" : "itens"} ao fechar (ruptura parcial)
                        </div>
                      )}
                    </div>
                    {isOpen && (
                      <div className="border-t border-border bg-muted/20 divide-y divide-border/50">
                        {g.items.map((item) => (
                          <div key={item.id} className="px-3 py-2 text-xs space-y-0.5">
                            <div className="font-medium flex items-center gap-1.5">
                              Pedido {item.numero_pedido ?? "—"} — {item.nome_produto ?? item.codigo_produto ?? "—"}
                              {item.ruptura && <AlertTriangle className="h-3 w-3 text-destructive shrink-0" />}
                            </div>
                            <div className="flex justify-between text-muted-foreground">
                              <span>{item.cliente ?? item.codigo_cliente ?? "—"}</span>
                              <span>{(item.peso ?? 0).toLocaleString("pt-BR")} kg</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          /* Desktop Table */
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="w-8" />
                  <TableHead className="w-8" />
                  <SortableTableHead sort={sort} sortKey="data" onSort={toggleSort}>Data</SortableTableHead>
                  <SortableTableHead sort={sort} sortKey="status" onSort={toggleSort} className="text-center">Status</SortableTableHead>
                  <SortableTableHead sort={sort} sortKey="portaria" onSort={toggleSort} className="text-center">Portaria</SortableTableHead>
                  <SortableTableHead sort={sort} sortKey="tipoCaminhao" onSort={toggleSort}>Tipo</SortableTableHead>
                  <SortableTableHead sort={sort} sortKey="placa" onSort={toggleSort}>Placa</SortableTableHead>
                  <SortableTableHead sort={sort} sortKey="motorista" onSort={toggleSort}>Motorista</SortableTableHead>
                  <SortableTableHead sort={sort} sortKey="nomeCarga" onSort={toggleSort}>Carga</SortableTableHead>
                  <SortableTableHead sort={sort} sortKey="pesoTotal" onSort={toggleSort} className="text-right">Peso (kg)</SortableTableHead>
                  <SortableTableHead sort={sort} sortKey="horarioPrevisto" onSort={toggleSort} className="text-center">Hr. Previsto</SortableTableHead>
                  <SortableTableHead sort={sort} sortKey="clientes" onSort={toggleSort} className="text-center">Clientes</SortableTableHead>
                  <SortableTableHead sort={sort} sortKey="tipoFrete" onSort={toggleSort}>Frete</SortableTableHead>
                  <SortableTableHead sort={sort} sortKey="ufs" onSort={toggleSort}>UFs</SortableTableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groups.map((g) => {
                  const isOpen = expanded.has(g.cargaId);
                  return (
                    <React.Fragment key={g.cargaId}>
                      <TableRow className="cursor-pointer hover:bg-muted/50" onClick={() => toggleExpand(g.cargaId)}>
                        <TableCell className="px-2">
                          {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </TableCell>
                        <TableCell className="px-1" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-0.5">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleOpenRomaneio(g)} title="Imprimir romaneio">
                              <FileText className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditGroup(g)} title="Editar carga">
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()} className="text-xs">
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1 font-mono">
                                <CalendarIcon className="h-3 w-3" />
                                {format(new Date(g.data + "T12:00:00"), "dd/MM/yyyy")}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar mode="single" selected={new Date(g.data + "T12:00:00")} onSelect={(d) => d && handleDateChange(g, d)} locale={ptBR} className={cn("p-3 pointer-events-auto")} />
                            </PopoverContent>
                          </Popover>
                        </TableCell>
                        <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                          <StatusSelect value={g.status} onChange={(v) => handleStatusChange(g, v)} />
                        </TableCell>
                        <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-center">
                            <PortariaStatusBadge info={getStatusPortaria(g.cargaId, g.placa)} />
                          </div>
                        </TableCell>
                        <TableCell className="text-xs">{g.tipoCaminhao ?? "—"}</TableCell>
                        <TableCell className="text-xs font-mono">
                          <div className="flex items-center gap-1.5">
                            <span>{g.placa ?? "—"}</span>
                            {g.rupturaCount > 0 && (
                              <button
                                onClick={(e) => { e.stopPropagation(); navigate(`/rupturas?carga=${encodeURIComponent(g.nomeCarga || g.cargaId)}`); }}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20 transition-colors"
                                title="Ver rupturas desta carga"
                              >
                                <AlertTriangle className="h-2.5 w-2.5" />{g.rupturaCount}
                              </button>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs">{g.motorista ?? "—"}</TableCell>
                        <TableCell className="text-xs">
                          {g.nomeCarga
                            ? <Badge variant="secondary" className="font-mono text-xs">{g.nomeCarga}</Badge>
                            : <span className="text-muted-foreground/50">—</span>}
                        </TableCell>
                        <TableCell className="text-right text-xs font-semibold">
                          {g.pesoTotal.toLocaleString("pt-BR")}
                          {g.pesoPlanejado > g.pesoTotal && (
                            <span
                              className="block text-[10px] font-normal text-amber-600 dark:text-amber-400"
                              title={`Planejado ${g.pesoPlanejado.toLocaleString("pt-BR")} kg / Embarcado ${g.pesoTotal.toLocaleString("pt-BR")} kg`}
                            >
                              pl. {g.pesoPlanejado.toLocaleString("pt-BR")}
                            </span>
                          )}
                          {g.parcialCount > 0 && (
                            <span
                              className="block text-[10px] font-medium text-amber-700 dark:text-amber-400"
                              title={`${g.parcialCount} item(ns) com peso reduzido ao fechar a carga`}
                            >
                              ↳ {g.pesoCortado.toLocaleString("pt-BR")} kg cortados ({g.parcialCount})
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-center text-xs font-mono">
                          {g.horarioPrevisto
                            ? g.horarioPrevisto.substring(0, 5)
                            : <span className="text-muted-foreground/40">—</span>}
                        </TableCell>
                        <TableCell className="text-center text-xs">{g.clientes.size}</TableCell>
                        <TableCell className="text-xs">{g.tipoFrete}</TableCell>
                        <TableCell className="text-xs">{[...g.ufs].sort().join(", ") || "—"}</TableCell>
                      </TableRow>
                      {isOpen && g.items.map((item) => (
                        <TableRow key={item.id} className="bg-muted/20">
                          <TableCell />
                          <TableCell />
                          <TableCell className="text-xs text-muted-foreground">
                            {format(new Date(item.data + "T12:00:00"), "dd/MM")}
                          </TableCell>
                          <TableCell />
                          <TableCell />
                          <TableCell className="text-xs text-muted-foreground" colSpan={2}>
                            <span className="flex items-center gap-1.5">
                              Pedido {item.numero_pedido ?? "—"} — {item.nome_produto ?? item.codigo_produto ?? "—"}
                              {item.ruptura && <AlertTriangle className="h-3 w-3 text-destructive shrink-0" />}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{item.cliente ?? item.codigo_cliente ?? "—"}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{item.vendedores?.nome_vendedor ?? "—"}</TableCell>
                          <TableCell className="text-right text-xs text-muted-foreground">{(item.peso ?? 0).toLocaleString("pt-BR")}</TableCell>
                          <TableCell className="text-center text-xs text-muted-foreground">{item.quantidade ?? "—"}</TableCell>
                          <TableCell />
                          <TableCell className="text-xs text-muted-foreground">{item.tipo_frete ?? "—"}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{item.uf ?? "—"}</TableCell>
                        </TableRow>
                      ))}
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
          </TabsContent>

          <TabsContent value="rupturas" className="mt-3 space-y-4">
            {isLoading ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Carregando…</p>
            ) : rupturaPorCarga.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Nenhuma ruptura no período. ✓</p>
            ) : (
              <>
                {/* Totais */}
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  <Card className="border-[#EF5350]/30">
                    <CardContent className="p-3 sm:p-4">
                      <p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wide">Cargas com ruptura</p>
                      <p className="text-sm sm:text-xl font-bold tracking-tight text-[#EF5350]">{rupturaPorCarga.length}</p>
                    </CardContent>
                  </Card>
                  <Card className="border-[#EF5350]/30">
                    <CardContent className="p-3 sm:p-4">
                      <p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wide">Peso total ruptura</p>
                      <p className="text-sm sm:text-xl font-bold tracking-tight text-[#EF5350]">{rupturaTotais.kg.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} kg</p>
                    </CardContent>
                  </Card>
                  <Card className="border-[#EF5350]/30">
                    <CardContent className="p-3 sm:p-4">
                      <p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wide">Itens distintos</p>
                      <p className="text-sm sm:text-xl font-bold tracking-tight text-[#EF5350]">{rupturaTotais.itens}</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Tabela 1: por carga */}
                <div>
                  <h2 className="text-sm font-semibold mb-2">Ruptura por carga</h2>
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Carga</TableHead>
                          <TableHead className="text-xs">Cliente(s)</TableHead>
                          <TableHead className="text-xs text-right">Peso planejado (kg)</TableHead>
                          <TableHead className="text-xs text-right">Peso ruptura (kg)</TableHead>
                          <TableHead className="text-xs text-right">Qtd ruptura (unid)</TableHead>
                          <TableHead className="text-xs text-center">Itens</TableHead>
                          <TableHead className="text-xs text-right">% Ruptura</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rupturaPorCarga.map((r) => (
                          <TableRow key={r.cargaId}>
                            <TableCell className="text-xs font-medium">
                              <button
                                className="hover:underline text-left"
                                onClick={() => navigate(`/rupturas?carga=${encodeURIComponent(r.nomeCarga || r.cargaId)}`)}
                                title="Ver itens em ruptura desta carga"
                              >
                                {r.nomeCarga || r.cargaId}
                              </button>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">{r.clientes}</TableCell>
                            <TableCell className="text-xs text-right font-mono tabular-nums">{r.pesoPlanejado.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}</TableCell>
                            <TableCell className="text-xs text-right font-mono tabular-nums text-[#EF5350]">{r.pesoRuptura.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}</TableCell>
                            <TableCell className="text-xs text-right font-mono tabular-nums text-[#EF5350]">{r.qtdRuptura.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</TableCell>
                            <TableCell className="text-xs text-center">{r.itensRuptura}</TableCell>
                            <TableCell className="text-xs text-right font-mono tabular-nums font-semibold text-[#EF5350]">{r.pctRuptura.toFixed(1)}%</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Tabela 2: por item */}
                <div>
                  <h2 className="text-sm font-semibold mb-2">Ruptura por item</h2>
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Produto</TableHead>
                          <TableHead className="text-xs">Código</TableHead>
                          <TableHead className="text-xs text-right">Total ruptura (kg)</TableHead>
                          <TableHead className="text-xs text-right">Total ruptura (unid)</TableHead>
                          <TableHead className="text-xs text-center">Cargas</TableHead>
                          <TableHead className="text-xs text-center">Pedidos</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rupturaPorItem.map((r) => (
                          <TableRow key={r.codigo + r.nome}>
                            <TableCell className="text-xs font-medium">{r.nome}</TableCell>
                            <TableCell className="text-xs text-muted-foreground font-mono">{r.codigo}</TableCell>
                            <TableCell className="text-xs text-right font-mono tabular-nums text-[#EF5350]">{r.kg.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}</TableCell>
                            <TableCell className="text-xs text-right font-mono tabular-nums text-[#EF5350]">{r.unid.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</TableCell>
                            <TableCell className="text-xs text-center">{r.cargas.size}</TableCell>
                            <TableCell className="text-xs text-center">{r.pedidos.size}</TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="bg-muted/40 font-semibold">
                          <TableCell className="text-xs" colSpan={2}>Total ({rupturaTotais.itens} {rupturaTotais.itens === 1 ? "item" : "itens"})</TableCell>
                          <TableCell className="text-xs text-right font-mono tabular-nums text-[#EF5350]">{rupturaTotais.kg.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}</TableCell>
                          <TableCell className="text-xs text-right font-mono tabular-nums text-[#EF5350]">{rupturaTotais.unid.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</TableCell>
                          <TableCell />
                          <TableCell />
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
      <ConsolidadoPrintDialog open={printOpen} onOpenChange={setPrintOpen} data={printData} />
      <CargaPrintDialog open={romaneioOpen} onOpenChange={setRomaneioOpen} data={romaneioData} />
      <EditarCargaDialog
        open={!!editGroup}
        onOpenChange={(o) => !o && setEditGroup(null)}
        group={editGroup}
        onSave={(cargaId, fields, _ids, itemUpdates, ordemUpdates) => editCargaMut.mutate({ cargaId, fields, itemUpdates, ordemUpdates })}
        onRemoveItem={(id) => removeFromCargaMut.mutate(id)}
        onDeleteCarga={(cargaId) => deleteCargaMut.mutate(cargaId)}
        onInverterOrdem={() => editGroup && inverterOrdemMut.mutate(editGroup.items)}
        saving={editCargaMut.isPending}
        deleting={deleteCargaMut.isPending}
        inverting={inverterOrdemMut.isPending}
      />
    </Layout>
  );
}
