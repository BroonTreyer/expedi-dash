import React, { useState, useMemo, useCallback, useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { CalendarIcon, Truck, Weight, Package, ChevronDown, ChevronRight, Printer, AlertTriangle, Pencil, FileText } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { SortableTableHead } from "@/components/ui/sortable-table-head";
import { useSortableTable } from "@/hooks/useSortableTable";
import { ConsolidadoPrintDialog, type ConsolidadoPrintData } from "@/components/dashboard/ConsolidadoPrintDialog";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { STATUSES, STATUS_COLORS } from "@/lib/constants";
import { StatusSelect } from "@/components/dashboard/StatusSelect";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "sonner";
import type { Carregamento } from "@/hooks/useCarregamentos";
import { EditarCargaDialog } from "@/components/dashboard/EditarCargaDialog";
import { pesoEfetivo } from "@/lib/peso-utils";
import { CargaPrintDialog, type CargaPrintData } from "@/components/dashboard/CargaPrintDialog";

function getToday() {
  return new Date().toISOString().split("T")[0];
}

function getInitialDate() {
  const params = new URLSearchParams(window.location.search);
  return params.get("data") || getToday();
}

function useConsolidado(dateFrom: string, dateTo?: string) {
  const dateEnd = dateTo || dateFrom;
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["consolidado", dateFrom, dateEnd],
    queryFn: async () => {
      const todayStr = new Date().toISOString().split("T")[0];
      let q = supabase
        .from("carregamentos_dia")
        .select("*, vendedores(nome_vendedor)")
        .not("carga_id", "is", null);

      const isSingleDay = dateFrom === dateEnd;
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

      const { data, error } = await q.order("carga_id", { ascending: true });
      if (error) throw error;
      return data as Carregamento[];
    },
    staleTime: 15_000,
  });

  // Realtime: listen for changes and invalidate
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
  clientes: Set<string>;
  ufs: Set<string>;
  status: string;
  data: string;
  items: Carregamento[];
}

function groupByCarga(data: Carregamento[]): CargaGroup[] {
  const map = new Map<string, CargaGroup>();
  const freteMap = new Map<string, Set<string>>();
  for (const item of data) {
    if (!item.carga_id) continue;
    let g = map.get(item.carga_id);
    if (!g) {
      g = {
        cargaId: item.carga_id,
        nomeCarga: item.nome_carga ?? null,
        placa: item.placa,
        motorista: item.motorista,
        tipoCaminhao: item.tipo_caminhao,
        tipoFrete: "",
        pesoTotal: 0,
        pesoPlanejado: 0,
        qtdPedidos: 0,
        rupturaCount: 0,
        clientes: new Set(),
        ufs: new Set(),
        status: item.status,
        data: item.data,
        items: [],
      };
      map.set(item.carga_id, g);
      freteMap.set(item.carga_id, new Set());
    }
    g.pesoPlanejado += item.peso ?? 0;
    g.pesoTotal += pesoEfetivo({ peso: item.peso, ruptura: !!item.ruptura });
    if (item.ruptura) g.rupturaCount += 1;
    if (item.codigo_cliente) g.clientes.add(item.codigo_cliente);
    if (item.uf) g.ufs.add(item.uf);
    if (item.tipo_frete) freteMap.get(item.carga_id)!.add(item.tipo_frete);
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
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [printOpen, setPrintOpen] = useState(false);
  const [romaneioData, setRomaneioData] = useState<CargaPrintData | null>(null);
  const [romaneioOpen, setRomaneioOpen] = useState(false);
  const [editGroup, setEditGroup] = useState<CargaGroup | null>(null);
  const { sort, toggleSort, sortData } = useSortableTable();
  const isMobile = useIsMobile();

  const queryClient = useQueryClient();
  const { data: rawData, isLoading } = useConsolidado(dateFromStr, dateToStr);

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
    mutationFn: async ({ cargaId, fields }: { cargaId: string; fields: Record<string, string> }) => {
      if (!cargaId) return;
      // Cascade: propaga para TODOS os itens da carga (mesmo carga_id),
      // garantindo que cargas fechadas sejam atualizadas em todos os lugares.
      const { error } = await supabase
        .from("carregamentos_dia")
        .update(fields)
        .eq("carga_id", cargaId);
      if (error) throw error;
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
      items: { id: string; nomeProduto: string | null; peso: number; ruptura?: boolean }[];
      pesoTotal: number;
      rupturaCount: number;
      ordem: number;
    }>();
    for (const item of group.items) {
      const key = item.codigo_cliente ?? `__sem__${item.cliente ?? "—"}`;
      let c = clienteMap.get(key);
      if (!c) {
        c = {
          codigoCliente: item.codigo_cliente,
          nomeCliente: item.cliente ?? null,
          items: [],
          pesoTotal: 0,
          rupturaCount: 0,
          ordem: item.ordem_entrega ?? 9999,
        };
        clienteMap.set(key, c);
      }
      c.items.push({
        id: item.id,
        nomeProduto: item.nome_produto ?? item.codigo_produto ?? null,
        peso: item.peso ?? 0,
        ruptura: !!item.ruptura,
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

    const totalPeso = groupsArr.reduce((s, g) => s + g.pesoTotal, 0);
    const totalRuptura = group.items
      .filter((i) => i.ruptura)
      .reduce((s, i) => s + (i.peso ?? 0), 0);

    const data: CargaPrintData = {
      cargaId: group.nomeCarga ?? group.cargaId,
      data: group.data,
      tipoCaminhao: group.tipoCaminhao ?? "—",
      placa: group.placa ?? "—",
      motorista: group.motorista ?? "—",
      transportadora: group.items[0]?.transportadora ?? undefined,
      horarioPrevisto: group.items[0]?.horario_previsto ?? undefined,
      groups: groupsArr,
      totalPeso,
      totalRuptura,
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

  const rawGroups = useMemo(() => groupByCarga(filtered), [filtered]);

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
    clientes: (g) => g.clientes.size,
    ufs: (g) => [...g.ufs].sort().join(", "),
    tipoFrete: (g) => g.tipoFrete,
  }), []);

  const groups = useMemo(() => sortData(rawGroups, consolidadoAccessors), [rawGroups, sortData, consolidadoAccessors]);

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

  const kpis = [
    { label: "Veículos", value: totalVeiculos, icon: Truck, color: "text-primary" },
    { label: "Peso Total", value: `${pesoTotal.toLocaleString("pt-BR")} kg`, icon: Weight, color: "text-foreground" },
    { label: "Pedidos", value: totalPedidos, icon: Package, color: "text-primary" },
  ];

  return (
    <Layout>
      <div className="p-4 sm:p-6 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="text-xs">← Painel</Button>
            <h1 className="text-lg font-bold tracking-tight">Consolidado de Cargas</h1>
          </div>
          <div>
            {groups.length > 0 && (
              <Button variant="outline" size="sm" onClick={() => setPrintOpen(true)}>
                <Printer className="h-4 w-4 sm:mr-1" /> <span className="hidden sm:inline">Imprimir</span>
              </Button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-end gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("h-9 text-xs sm:text-sm justify-start gap-2 min-w-[140px]", !dateRange.from && "text-muted-foreground")}>
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
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="range" selected={dateRange} onSelect={(range) => { if (range) setDateRange(range); }} locale={ptBR} numberOfMonths={2} className={cn("p-3 pointer-events-auto")} />
              <div className="p-2 border-t flex justify-end gap-1">
                <Button variant="ghost" size="sm" className="text-xs" onClick={() => setDateRange({ from: today, to: today })}>Hoje</Button>
                <Button variant="ghost" size="sm" className="text-xs" onClick={() => { const d = new Date(); d.setDate(d.getDate() - 6); setDateRange({ from: d, to: today }); }}>Últimos 7 dias</Button>
                <Button variant="ghost" size="sm" className="text-xs" onClick={() => { const d = new Date(); setDateRange({ from: new Date(d.getFullYear(), d.getMonth(), 1), to: d }); }}>Este mês</Button>
              </div>
            </PopoverContent>
          </Popover>

          <Select value={filterUf} onValueChange={setFilterUf}>
            <SelectTrigger className="h-9 w-[100px] sm:w-[130px] text-xs sm:text-sm">
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
            <SelectTrigger className="h-9 w-[130px] sm:w-[180px] text-xs sm:text-sm">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos status</SelectItem>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* KPI Cards */}
        <TooltipProvider delayDuration={300}>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {kpis.map((k) => (
              <Card key={k.label} className="border-border/60">
                <CardContent className="p-3 sm:p-4 flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wide">{k.label}</span>
                    <k.icon className={`h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 ${k.color}`} />
                  </div>
                  <span className="text-sm sm:text-xl font-bold tracking-tight truncate">{k.value}</span>
                </CardContent>
              </Card>
            ))}
          </div>
          {tipoBreakdown !== "—" && (
            <p className="text-xs text-muted-foreground">Distribuição: {tipoBreakdown}</p>
          )}
        </TooltipProvider>

        {/* Content */}
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
                        <div><span className="text-muted-foreground">Data: </span>{format(new Date(g.data + "T12:00:00"), "dd/MM")}</div>
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
                  <SortableTableHead sort={sort} sortKey="tipoCaminhao" onSort={toggleSort}>Tipo</SortableTableHead>
                  <SortableTableHead sort={sort} sortKey="placa" onSort={toggleSort}>Placa</SortableTableHead>
                  <SortableTableHead sort={sort} sortKey="motorista" onSort={toggleSort}>Motorista</SortableTableHead>
                  <SortableTableHead sort={sort} sortKey="nomeCarga" onSort={toggleSort}>Carga</SortableTableHead>
                  <SortableTableHead sort={sort} sortKey="pesoTotal" onSort={toggleSort} className="text-right">Peso (kg)</SortableTableHead>
                  <SortableTableHead sort={sort} sortKey="qtdPedidos" onSort={toggleSort} className="text-center">Pedidos</SortableTableHead>
                  <SortableTableHead sort={sort} sortKey="rupturaCount" onSort={toggleSort} className="text-center">Rupturas</SortableTableHead>
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
                        <TableCell className="text-xs">{g.tipoCaminhao ?? "—"}</TableCell>
                        <TableCell className="text-xs font-mono">{g.placa ?? "—"}</TableCell>
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
                        </TableCell>
                        <TableCell className="text-center text-xs">{g.qtdPedidos}</TableCell>
                        <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                          {g.rupturaCount > 0 ? (
                            <button
                              onClick={() => navigate(`/rupturas?carga=${encodeURIComponent(g.nomeCarga || g.cargaId)}`)}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20 transition-colors"
                              title="Ver rupturas desta carga"
                            >
                              <AlertTriangle className="h-3 w-3" />{g.rupturaCount}
                            </button>
                          ) : (
                            <span className="text-muted-foreground/40 text-xs">—</span>
                          )}
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
      </div>
      <ConsolidadoPrintDialog open={printOpen} onOpenChange={setPrintOpen} data={printData} />
      <CargaPrintDialog open={romaneioOpen} onOpenChange={setRomaneioOpen} data={romaneioData} />
      <EditarCargaDialog
        open={!!editGroup}
        onOpenChange={(o) => !o && setEditGroup(null)}
        group={editGroup}
        onSave={(cargaId, fields) => editCargaMut.mutate({ cargaId, fields })}
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
