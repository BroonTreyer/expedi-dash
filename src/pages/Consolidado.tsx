import React, { useState, useMemo, useCallback } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Truck, Weight, Package, ChevronDown, ChevronRight, Printer } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TooltipProvider } from "@/components/ui/tooltip";
import { toast } from "sonner";
import type { Carregamento } from "@/hooks/useCarregamentos";

const today = new Date().toISOString().split("T")[0];

function getInitialDate() {
  const params = new URLSearchParams(window.location.search);
  return params.get("data") || today;
}

function useConsolidado(date: string) {
  return useQuery({
    queryKey: ["consolidado", date],
    queryFn: async () => {
      const todayStr = new Date().toISOString().split("T")[0];
      let q = supabase
        .from("carregamentos_dia")
        .select("*, vendedores(nome_vendedor)")
        .not("carga_id", "is", null);

      if (date === todayStr) {
        // Today: also bring non-loaded items from previous days
        q = q.or(`data.eq.${date},and(data.lt.${date},status.neq.Carregado)`);
      } else {
        q = q.eq("data", date);
      }

      const { data, error } = await q.order("carga_id", { ascending: true });
      if (error) throw error;
      return data as Carregamento[];
    },
    staleTime: 30_000,
  });
}

interface CargaGroup {
  cargaId: string;
  placa: string | null;
  motorista: string | null;
  tipoCaminhao: string | null;
  pesoTotal: number;
  qtdPedidos: number;
  clientes: Set<string>;
  ufs: Set<string>;
  status: string;
  items: Carregamento[];
}

function groupByCarga(data: Carregamento[]): CargaGroup[] {
  const map = new Map<string, CargaGroup>();
  for (const item of data) {
    if (!item.carga_id) continue;
    let g = map.get(item.carga_id);
    if (!g) {
      g = {
        cargaId: item.carga_id,
        placa: item.placa,
        motorista: item.motorista,
        tipoCaminhao: item.tipo_caminhao,
        pesoTotal: 0,
        qtdPedidos: 0,
        clientes: new Set(),
        ufs: new Set(),
        status: item.status,
        items: [],
      };
      map.set(item.carga_id, g);
    }
    g.pesoTotal += item.peso ?? 0;
    if (item.codigo_cliente) g.clientes.add(item.codigo_cliente);
    if (item.uf) g.ufs.add(item.uf);
    g.items.push(item);
  }
  for (const g of map.values()) {
    g.qtdPedidos = g.items.length;
  }
  return Array.from(map.values());
}

export default function Consolidado() {
  const [date, setDate] = useState(getInitialDate);
  const [filterUf, setFilterUf] = useState("todos");
  const [filterStatus, setFilterStatus] = useState("todos");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [printOpen, setPrintOpen] = useState(false);
  const { sort, toggleSort, sortData } = useSortableTable();

  const queryClient = useQueryClient();
  const { data: rawData, isLoading } = useConsolidado(date);

  const updateStatusMut = useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: string }) => {
      const { error } = await supabase
        .from("carregamentos_dia")
        .update({ status })
        .in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["consolidado", date] });
      toast.success("Status atualizado");
    },
    onError: () => toast.error("Erro ao atualizar status"),
  });

  const handleStatusChange = useCallback(
    (group: CargaGroup, newStatus: string) => {
      const ids = group.items.map((i) => i.id);
      updateStatusMut.mutate({ ids, status: newStatus });
    },
    [updateStatusMut]
  );

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
    status: (g) => g.status,
    tipoCaminhao: (g) => g.tipoCaminhao ?? "",
    placa: (g) => g.placa ?? "",
    motorista: (g) => g.motorista ?? "",
    pesoTotal: (g) => g.pesoTotal,
    qtdPedidos: (g) => g.qtdPedidos,
    clientes: (g) => g.clientes.size,
    ufs: (g) => [...g.ufs].sort().join(", "),
  }), []);

  const groups = useMemo(() => sortData(rawGroups, consolidadoAccessors), [rawGroups, sortData, consolidadoAccessors]);

  // KPIs — count unique pedidos globally
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
      data: date,
      groups: groups.map((g) => ({
        cargaId: g.cargaId,
        tipoCaminhao: g.tipoCaminhao,
        placa: g.placa,
        motorista: g.motorista,
        transportadora: g.items[0]?.transportadora ?? null,
        status: g.status,
        pesoTotal: g.pesoTotal,
        qtdPedidos: g.qtdPedidos,
        qtdClientes: g.clientes.size,
        ufs: [...g.ufs].sort().join(", ") || "—",
      })),
      totalVeiculos,
      totalPeso: pesoTotal,
      totalPedidos,
    };
  }, [groups, date, totalVeiculos, pesoTotal, totalPedidos]);

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

  const dateObj = new Date(date + "T12:00:00");

  const kpis = [
    { label: "Veículos", value: totalVeiculos, icon: Truck, color: "text-primary" },
    { label: "Peso Total", value: `${pesoTotal.toLocaleString("pt-BR")} kg`, icon: Weight, color: "text-foreground" },
    { label: "Pedidos", value: totalPedidos, icon: Package, color: "text-primary" },
  ];

  return (
    <Layout>
      <div className="p-4 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold tracking-tight">Consolidado de Cargas</h1>
          {groups.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => setPrintOpen(true)}>
              <Printer className="h-4 w-4 mr-1" /> Imprimir
            </Button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-end gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="h-9 text-sm justify-start gap-2 min-w-[160px]">
                <CalendarIcon className="h-4 w-4" />
                {format(dateObj, "dd/MM/yyyy")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateObj}
                onSelect={(d) => d && setDate(format(d, "yyyy-MM-dd"))}
                locale={ptBR}
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>

          <Select value={filterUf} onValueChange={setFilterUf}>
            <SelectTrigger className="h-9 w-[130px] text-sm">
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
            <SelectTrigger className="h-9 w-[180px] text-sm">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os status</SelectItem>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* KPI Cards */}
        <TooltipProvider delayDuration={300}>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
            {kpis.map((k) => (
              <Card key={k.label} className="border-border/60">
                <CardContent className="p-3 sm:p-4 flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wide">{k.label}</span>
                    <k.icon className={`h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 ${k.color}`} />
                  </div>
                  <span className="text-base sm:text-xl font-bold tracking-tight truncate">{k.value}</span>
                </CardContent>
              </Card>
            ))}
          </div>
          {tipoBreakdown !== "—" && (
            <p className="text-xs text-muted-foreground">Distribuição: {tipoBreakdown}</p>
          )}
        </TooltipProvider>

        {/* Table */}
        {isLoading ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Carregando…</p>
        ) : groups.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Nenhuma carga consolidada para este dia.</p>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="w-8" />
                  <SortableTableHead sort={sort} sortKey="status" onSort={toggleSort}>Status</SortableTableHead>
                  <SortableTableHead sort={sort} sortKey="tipoCaminhao" onSort={toggleSort}>Tipo</SortableTableHead>
                  <SortableTableHead sort={sort} sortKey="placa" onSort={toggleSort}>Placa</SortableTableHead>
                  <SortableTableHead sort={sort} sortKey="motorista" onSort={toggleSort}>Motorista</SortableTableHead>
                  <SortableTableHead sort={sort} sortKey="pesoTotal" onSort={toggleSort} className="text-right">Peso (kg)</SortableTableHead>
                  <SortableTableHead sort={sort} sortKey="qtdPedidos" onSort={toggleSort} className="text-center">Pedidos</SortableTableHead>
                  <SortableTableHead sort={sort} sortKey="clientes" onSort={toggleSort} className="text-center">Clientes</SortableTableHead>
                  <SortableTableHead sort={sort} sortKey="ufs" onSort={toggleSort}>UFs</SortableTableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groups.map((g) => {
                  const isOpen = expanded.has(g.cargaId);
                  return (
                    <React.Fragment key={g.cargaId}>
                      <TableRow
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => toggleExpand(g.cargaId)}
                      >
                        <TableCell className="px-2">
                          {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <StatusSelect
                            value={g.status}
                            onChange={(v) => handleStatusChange(g, v)}
                          />
                        </TableCell>
                        <TableCell className="text-xs">{g.tipoCaminhao ?? "—"}</TableCell>
                        <TableCell className="text-xs font-mono">{g.placa ?? "—"}</TableCell>
                        <TableCell className="text-xs">{g.motorista ?? "—"}</TableCell>
                        <TableCell className="text-right text-xs font-semibold">{g.pesoTotal.toLocaleString("pt-BR")}</TableCell>
                        <TableCell className="text-center text-xs">{g.qtdPedidos}</TableCell>
                        <TableCell className="text-center text-xs">{g.clientes.size}</TableCell>
                        <TableCell className="text-xs">{[...g.ufs].sort().join(", ") || "—"}</TableCell>
                      </TableRow>
                      {isOpen && g.items.map((item) => (
                        <TableRow key={item.id} className="bg-muted/20">
                          <TableCell />
                          <TableCell className="text-xs text-muted-foreground" colSpan={2}>
                            Pedido {item.numero_pedido ?? "—"} — {item.nome_produto ?? item.codigo_produto ?? "—"}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{item.cliente ?? item.codigo_cliente ?? "—"}</TableCell>
                          <TableCell className="text-right text-xs text-muted-foreground">{(item.peso ?? 0).toLocaleString("pt-BR")}</TableCell>
                          <TableCell className="text-center text-xs text-muted-foreground">{item.quantidade ?? "—"}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{item.vendedores?.nome_vendedor ?? "—"}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{item.tipo_frete ?? "—"}</TableCell>
                          <TableCell />
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
    </Layout>
  );
}
