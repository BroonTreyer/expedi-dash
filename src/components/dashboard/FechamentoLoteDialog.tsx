import { useState, useEffect, useMemo, useCallback, lazy, Suspense, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Truck, MapPin, Package, Link2, LogIn, Clock, GripVertical } from "lucide-react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { MotoristaAutocomplete } from "@/components/portaria/MotoristaAutocomplete";
import { CaminhaoAutocomplete } from "@/components/portaria/CaminhaoAutocomplete";
import { cn } from "@/lib/utils";
import { useCaminhoes } from "@/hooks/useCaminhoes";
import { useVeiculosAguardandoVinculo } from "@/hooks/useVeiculosEsperados";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { pesoEfetivo } from "@/lib/peso-utils";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Carregamento } from "@/hooks/useCarregamentos";
import type { CargaPrintData } from "./CargaPrintDialog";
import type { RoteirizacaoResult, RotaGroup } from "./RoteirizacaoDialog";
import { useUpsertRotaExecutada } from "@/hooks/useRotasExecutadas";

const RotaMap = lazy(() => import("./RotaMap").then((m) => ({ default: m.RotaMap })).catch(() => import("./RotaMap").then((m) => ({ default: m.RotaMap }))));

/* ─── Sortable destination row ─── */
function SortableDestRow({ id, group, idx, total, colorClass }: {
  id: string; group: RotaGroup; idx: number; total: number; colorClass: string;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 px-2 py-1 rounded bg-muted/20 text-xs",
        isDragging && "z-50 shadow-lg ring-2 ring-primary/30 opacity-90"
      )}
    >
      <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing touch-none p-0.5 text-muted-foreground hover:text-foreground" tabIndex={-1}>
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      <span className={cn("font-bold w-5 text-center", colorClass)}>{group.ordem}</span>
      <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
      <span className="truncate flex-1">{group.nomeCliente ?? "Sem cliente"} – {group.cidade}{group.uf ? `/${group.uf}` : ""}</span>
      <span className="font-mono text-muted-foreground">{group.pesoTotal.toLocaleString("pt-BR")} kg</span>
    </div>
  );
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: Carregamento[];
  tiposCaminhao: { nome_tipo: string }[];
  onSubmit: (updates: { id: string; tipo_caminhao: string; placa: string; motorista: string; transportadora: string; ordem_entrega: number; etapa: string; carga_id: string; data: string; horario_previsto?: string; nome_carga?: string; ordem_carga?: string }[], meta: { cargaId: string; transportadora: string; placa: string; motorista: string; dataCarregamento: string; totalPeso: number; totalPedidos: number; destinos: string; ordemCarga?: string }) => void;
  onPrintReady?: (data: CargaPrintData) => void;
  selectedDate?: string;
  roteirizacao?: RoteirizacaoResult | null;
}

export function FechamentoLoteDialog({ open, onOpenChange, items, tiposCaminhao, onSubmit, onPrintReady, selectedDate, roteirizacao }: Props) {
  const [tipoCaminhao, setTipoCaminhao] = useState("");
  const [placa, setPlaca] = useState("");
  const [motorista, setMotorista] = useState("");
  const origemEstavel = useMemo(() => ({ cidade: "Goiânia", uf: "GO" }), []);
  const [transportadora, setTransportadora] = useState("");
  const [horarioPrevisto, setHorarioPrevisto] = useState("");
  const [dataCarregamento, setDataCarregamento] = useState("");
  const [nomeCarga, setNomeCarga] = useState("");
  const [ordemCarga, setOrdemCarga] = useState("");
  const [veiculoVinculado, setVeiculoVinculado] = useState("manual");
  const [walkInVinculadoId, setWalkInVinculadoId] = useState<string | null>(null);
  const { user } = useAuth();
  const { data: veiculosNoPatio = [] } = useVeiculosAguardandoVinculo();
  const upsertRotaExec = useUpsertRotaExecutada();

  // Fetch caminhões cadastrados
  const { data: caminhoesCadastrados = [] } = useCaminhoes();

  const veiculosDisponiveis = useMemo(() => {
    return caminhoesCadastrados.map((c) => ({
      id: c.id,
      label: `${c.placa}${c.motorista?.nome_completo ? ` – ${c.motorista.nome_completo}` : ""}${c.tipo_caminhao ? ` (${c.tipo_caminhao})` : ""}`,
      placa: c.placa,
      motorista: c.motorista?.nome_completo || "",
      transportadora: c.transportadora || "",
      tipoCaminhao: c.tipo_caminhao || "",
    }));
  }, [caminhoesCadastrados]);

  const handleVincularVeiculo = (val: string) => {
    setVeiculoVinculado(val);
    if (val === "manual") return;
    const veiculo = veiculosDisponiveis.find((v) => v.id === val);
    if (veiculo) {
      setPlaca(veiculo.placa);
      setMotorista(veiculo.motorista);
      setTransportadora(veiculo.transportadora);
      if (veiculo.tipoCaminhao) setTipoCaminhao(veiculo.tipoCaminhao);
    }
  };

  // Use groups from roteirizacao if available, otherwise build from items
  const initialGroups: RotaGroup[] = useMemo(() => {
    if (roteirizacao?.groups && roteirizacao.groups.length > 0) {
      return roteirizacao.groups;
    }
    const map = new Map<string, RotaGroup>();
    items.forEach((c) => {
      const key = c.codigo_cliente ?? "__sem_cliente__";
      if (!map.has(key)) {
        map.set(key, { codigoCliente: c.codigo_cliente, nomeCliente: c.cliente, cidade: c.cidade, uf: c.uf, items: [], pesoTotal: 0, pesoPlanejado: 0, rupturaCount: 0, ordem: 0 });
      }
      const g = map.get(key)!;
      const ruptura = !!c.ruptura;
      g.items.push({ id: c.id, peso: c.peso ?? 0, numeroPedido: c.numero_pedido, ruptura });
      g.pesoPlanejado += c.peso ?? 0;
      g.pesoTotal += pesoEfetivo({ peso: c.peso, ruptura });
      if (ruptura) g.rupturaCount += 1;
    });
    return Array.from(map.values()).map((g, idx) => ({ ...g, ordem: idx + 1 }));
  }, [roteirizacao, items]);

  // Local mutable copy so user can reorder before fechar
  const [groups, setGroups] = useState<RotaGroup[]>(initialGroups);
  useEffect(() => { setGroups(initialGroups); }, [initialGroups]);

  const handleReorder = useCallback((ordemAtual: number, dir: "up" | "down") => {
    setGroups((prev) => {
      const idx = prev.findIndex((g) => g.ordem === ordemAtual);
      if (idx < 0) return prev;
      const target = dir === "up" ? idx - 1 : idx + 1;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[target]] = [next[target], next[idx]];
      return next.map((g, i) => ({ ...g, ordem: i + 1 }));
    });
  }, []);

  // DnD setup
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const dndKey = useCallback((g: RotaGroup) => g.codigoCliente ?? `__sem__${g.ordem}`, []);
  const sortableIds = useMemo(() => groups.map(dndKey), [groups, dndKey]);
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setGroups((prev) => {
      const oldIdx = prev.findIndex((g) => dndKey(g) === active.id);
      const newIdx = prev.findIndex((g) => dndKey(g) === over.id);
      if (oldIdx < 0 || newIdx < 0) return prev;
      return arrayMove(prev, oldIdx, newIdx).map((g, i) => ({ ...g, ordem: i + 1 }));
    });
  }, [dndKey]);

  useEffect(() => {
    if (open) {
      setTipoCaminhao("");
      setPlaca("");
      setMotorista("");
      setTransportadora("");
      setHorarioPrevisto("");
      setNomeCarga("");
      setOrdemCarga("");
      setVeiculoVinculado("manual");
      setWalkInVinculadoId(null);
      setDataCarregamento(selectedDate ?? new Date().toISOString().split("T")[0]);
    }
  }, [open, selectedDate]);

  const handleVincularWalkIn = (v: typeof veiculosNoPatio[number]) => {
    setPlaca(v.placa);
    if (v.motorista) setMotorista(v.motorista);
    if (v.transportadora) setTransportadora(v.transportadora);
    if (v.tipo_veiculo) setTipoCaminhao(v.tipo_veiculo);
    setWalkInVinculadoId(v.id);
    setVeiculoVinculado("manual");
  };

  const totalPeso = useMemo(() => groups.reduce((s, g) => s + g.pesoTotal, 0), [groups]);
  const totalPlanejado = useMemo(() => groups.reduce((s, g) => s + (g.pesoPlanejado ?? g.pesoTotal), 0), [groups]);
  const totalRuptura = Math.max(0, totalPlanejado - totalPeso);
  const totalRupturaItems = useMemo(() => groups.reduce((s, g) => s + (g.rupturaCount ?? 0), 0), [groups]);
  const totalPedidos = useMemo(() => groups.reduce((s, g) => s + g.items.length, 0), [groups]);
  const ufsUnicas = useMemo(() => { const set = new Set<string>(); groups.forEach((g) => { if (g.uf) set.add(g.uf); }); return Array.from(set).sort(); }, [groups]);

  const canSubmit = tipoCaminhao && placa && motorista && dataCarregamento && ordemCarga.trim().length > 0 && totalPedidos > 0;

  // Submit guard: blocks double-clicks on "Fechar Carga" while the batch is in flight.
  // Without this, the user could trigger 2 simultaneous batch updates and create duplicate
  // carga_id rows + duplicate veiculos_esperados entries.
  const submitGuard = useRef<boolean>(false);
  const [submitting, setSubmitting] = useState(false);

  // Reset submitting ao reabrir o dialog
  useEffect(() => {
    if (open) setSubmitting(false);
  }, [open]);

  const handleSubmit = async () => {
    if (submitGuard.current || submitting) return;
    submitGuard.current = true;
    setSubmitting(true);
    try {
    const now = new Date();
    const dateStr = now.toISOString().split("T")[0].replace(/-/g, "");
    const timeStr = now.toTimeString().split(" ")[0].replace(/:/g, "").substring(0, 6);
    const rand = Math.random().toString(36).substring(2, 5).toUpperCase();
    const cargaId = nomeCarga || `CG-${dateStr}-${timeStr}-${rand}`;
    const nomeCargaFinal = nomeCarga || cargaId;

    const updates = groups.flatMap((group) =>
      group.items.map((item) => ({
        id: item.id,
        tipo_caminhao: tipoCaminhao,
        placa,
        motorista,
        transportadora,
        ordem_entrega: group.ordem,
        etapa: "logistica",
        carga_id: cargaId,
        data: dataCarregamento,
        ...(horarioPrevisto ? { horario_previsto: horarioPrevisto } : {}),
        nome_carga: nomeCargaFinal,
        ordem_carga: ordemCarga.trim(),
      }))
    );
    const destinos = groups.filter(g => g.cidade).map(g => `${g.cidade}/${g.uf}`).join(", ");

    // Auto-autorizar veículo no pátio (walk-in) se foi vinculado a esta carga
    const placaNorm = placa.trim().toUpperCase();
    let walkInIdParaAutorizar: string | null =
      walkInVinculadoId ??
      veiculosNoPatio.find((v) => v.placa.trim().toUpperCase() === placaNorm)?.id ??
      null;

    // Fallback: busca direta no banco por qualquer walk-in ativo recente com a mesma placa
    // (cobre o caso "placa digitada manualmente, walk-in fora do filtro de hoje")
    if (!walkInIdParaAutorizar && placaNorm) {
      try {
        const { data: walkInRows } = await supabase
          .from("veiculos_esperados" as any)
          .select("id")
          .eq("placa", placaNorm)
          .eq("walk_in", true)
          .eq("conferido", false)
          .in("status_autorizacao", ["aguardando_vinculo", "aguardando_autorizacao", "autorizado"])
          .order("created_at", { ascending: false })
          .limit(1);
        const row = (walkInRows ?? [])[0] as { id?: string } | undefined;
        if (row?.id) walkInIdParaAutorizar = row.id;
      } catch (e) {
        console.error("Falha ao buscar walk-in por placa:", e);
      }
    }

    if (walkInIdParaAutorizar) {
      try {
        await supabase
          .from("veiculos_esperados" as any)
          .update({
            status_autorizacao: "autorizado",
            carga_id: cargaId,
            autorizado_por: user?.id ?? null,
            autorizado_em: new Date().toISOString(),
          } as any)
          .eq("id", walkInIdParaAutorizar);
      } catch (e) {
        // Silencioso: fechamento de carga não deve quebrar por isso
        console.error("Falha ao autorizar walk-in vinculado:", e);
      }
    }

    onSubmit(updates, { cargaId, transportadora, placa, motorista, dataCarregamento, totalPeso, totalPedidos, destinos, ordemCarga: ordemCarga.trim() });
    onOpenChange(false);

    // Salva snapshot da rota planejada (km, custo, duração, ordem) para o histórico
    if (roteirizacao?.distanciaTotal && roteirizacao.distanciaTotal > 0) {
      try {
        await upsertRotaExec.mutateAsync({
          carga_id: cargaId,
          data_referencia: dataCarregamento,
          km_planejado: roteirizacao.distanciaTotal,
          custo_planejado: roteirizacao.custoCombustivel ?? null,
          duracao_planejada_min: roteirizacao.tempoTotalMin ?? null,
          tipo_caminhao: roteirizacao.tipoCaminhao ?? tipoCaminhao,
          origem: "Goiânia/GO",
          provider: "ors",
          ordem_planejada: groups.map((g) => ({
            ordem: g.ordem,
            cliente: g.nomeCliente,
            cidade: g.cidade,
            uf: g.uf,
            peso: g.pesoTotal,
          })) as any,
        });
      } catch (e) {
        console.error("Falha ao salvar histórico de rota:", e);
      }
    }

    if (onPrintReady) {
      const tipoFreteSet = new Set(items.map((i) => i.tipo_frete).filter(Boolean) as string[]);
      const tipoFreteStr = Array.from(tipoFreteSet).join("/") || undefined;
      onPrintReady({
        cargaId,
        data: dataCarregamento,
        tipoCaminhao,
        placa,
        motorista,
        transportadora: transportadora || undefined,
        horarioPrevisto: horarioPrevisto || undefined,
        tipoFrete: tipoFreteStr,
        groups: groups.map((g) => ({
          codigoCliente: g.codigoCliente,
          nomeCliente: g.nomeCliente,
          formaPagamento:
            (items.find((it) => it.codigo_cliente === g.codigoCliente) as any)?.forma_pagamento ?? null,
          items: g.items.map((i) => ({ id: i.id, nomeProduto: null, peso: i.peso, ruptura: i.ruptura })),
          pesoTotal: g.pesoTotal,
          rupturaCount: g.rupturaCount,
          ordem: g.ordem,
        })),
        totalPeso,
        totalRuptura,
        totalPedidos,
      });
    }
    } finally {
      // Libera após o submit; o dialog já foi fechado por onOpenChange(false) acima.
      submitGuard.current = false;
      setSubmitting(false);
    }
  };

  const rotaDestinos = useMemo(
    () => groups.filter((g) => g.cidade && g.uf).map((g) => ({ ordem: g.ordem, cliente: g.nomeCliente ?? "Sem cliente", cidade: g.cidade!, uf: g.uf! })),
    [groups]
  );

  return (
    <Dialog open={open} onOpenChange={(o) => {
      // Bloqueia fechar (ESC, overlay, X) enquanto a operação está em curso
      if (!o && submitting) return;
      onOpenChange(o);
    }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto w-[calc(100vw-2rem)] sm:w-full">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Truck className="h-5 w-5" /> Fechar Carga</DialogTitle>
          <DialogDescription>Preencha os dados de transporte e confirme o fechamento.</DialogDescription>
        </DialogHeader>

        {/* Summary */}
        <div className="flex flex-wrap items-center gap-3 px-3 py-2 rounded-lg bg-muted/30 border border-border text-sm">
          <div className="flex items-center gap-1.5 font-medium">
            <Package className="h-4 w-4 text-primary" />
            <span>{totalPedidos} pedidos</span>
          </div>
          <span className="font-medium">{totalPeso.toLocaleString("pt-BR")} kg embarcados</span>
          {totalRuptura > 0 && (
            <span className="text-xs text-amber-600 dark:text-amber-400">
              ↳ {totalRuptura.toLocaleString("pt-BR")} kg em ruptura ({totalRupturaItems} {totalRupturaItems === 1 ? "item" : "itens"} — não embarcado)
            </span>
          )}
          {roteirizacao?.distanciaTotal != null && roteirizacao.distanciaTotal > 0 && (
            // BUG 20 FIX: Format with locale number separator
            <span className="font-medium">{roteirizacao.distanciaTotal.toLocaleString("pt-BR")} km</span>
          )}
          <div className="flex gap-1 flex-wrap">
            {ufsUnicas.map((uf) => <Badge key={uf} variant="secondary" className="text-xs font-bold">{uf}</Badge>)}
          </div>
        </div>

        {/* Destinations summary — drag para reordenar (atualiza ordem_entrega ao fechar) */}
        <div>
          <p className="text-[11px] text-muted-foreground mb-1 px-1">Arraste para reordenar — a ordem será gravada ao fechar a carga.</p>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
              <div className="space-y-1">
                {groups.map((g, idx) => {
                  const colorClass = idx === 0 ? "text-green-600" : idx === groups.length - 1 ? "text-red-500" : "text-primary";
                  return (
                    <SortableDestRow key={dndKey(g)} id={dndKey(g)} group={g} idx={idx} total={groups.length} colorClass={colorClass} />
                  );
                })}
              </div>
            </SortableContext>
          </DndContext>
        </div>

        {/* BUG 7 FIX: Pass coordsCache from roteirizacao to avoid redundant geocoding */}
        {/* BUG 18 FIX: Suspense fallback height matches RotaMap h-[320px] */}
        {/* BUG 19 FIX: Pass loading={false} so overlay feedback works correctly */}
        {rotaDestinos.length > 0 && (
          <Suspense fallback={<div className="h-[320px] rounded-lg border border-border bg-muted/20 flex items-center justify-center text-sm text-muted-foreground animate-pulse">Carregando mapa...</div>}>
            <RotaMap
              destinos={rotaDestinos}
              origem={origemEstavel}
              routeGeometry={roteirizacao?.routeGeometry}
              distanciaTotal={roteirizacao?.distanciaTotal}
              trechos={roteirizacao?.trechos}
              loading={false}
              coordsCache={roteirizacao?.coordsCache}
              custoCombustivel={roteirizacao?.custoCombustivel ?? null}
              tipoCaminhaoLabel={roteirizacao?.tipoCaminhao ?? null}
              tempoTotalMin={roteirizacao?.tempoTotalMin ?? null}
              onReorder={handleReorder}
            />
          </Suspense>
        )}

        {/* Veículos no pátio aguardando vínculo */}
        {veiculosNoPatio.length > 0 && (
          <div className="border-t border-border pt-3">
            <div className="flex items-center gap-2 mb-2">
              <LogIn className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-semibold text-primary uppercase tracking-wide">
                Veículos no pátio aguardando vínculo
              </span>
              <Badge variant="outline" className="text-[10px] h-5 border-primary/40 bg-primary/10 text-primary">
                {veiculosNoPatio.length}
              </Badge>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {veiculosNoPatio.map((v) => {
                const selected = walkInVinculadoId === v.id;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => handleVincularWalkIn(v)}
                    className={cn(
                      "text-left rounded-md border p-2 text-xs transition-colors hover:border-primary hover:bg-primary/5",
                      selected ? "border-primary bg-primary/10 ring-1 ring-primary" : "bg-card"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold">{v.placa}</span>
                      <Badge variant="outline" className="text-[10px] h-5 gap-0.5">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(v.created_at), { addSuffix: true, locale: ptBR })}
                      </Badge>
                    </div>
                    <div className="text-muted-foreground mt-0.5 truncate">
                      {v.motorista || "—"}
                      {v.tipo_veiculo && <> • {v.tipo_veiculo}</>}
                    </div>
                  </button>
                );
              })}
            </div>
            {walkInVinculadoId && (
              <p className="text-[11px] text-primary mt-2">
                ✓ Veículo vinculado — será automaticamente liberado ao fechar a carga.
              </p>
            )}
          </div>
        )}

        {/* Transport fields */}
        <div className="border-t border-border pt-3">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">Dados de Transporte</span>
          {veiculosDisponiveis.length > 0 && (
            <div className="space-y-1.5 mb-3">
              <Label className="text-xs flex items-center gap-1.5"><Link2 className="h-3.5 w-3.5" /> Vincular a veículo</Label>
              <Select value={veiculoVinculado} onValueChange={handleVincularVeiculo}>
                <SelectTrigger><SelectValue placeholder="Preencher manualmente" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Preencher manualmente</SelectItem>
                  {veiculosDisponiveis.map((v) => (
                    <SelectItem key={v.id} value={v.id}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Nome da Carga</Label>
              <Input value={nomeCarga} onChange={(e) => setNomeCarga(e.target.value)} placeholder="Ex: Carga MG Norte (opcional)" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Ordem de Carga *</Label>
              <Input
                value={ordemCarga}
                onChange={(e) => setOrdemCarga(e.target.value)}
                placeholder="Ex: OC-1234"
              />
              <p className="text-[10px] text-muted-foreground">Usada para vincular o CT-e/DACTE a esta carga.</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Data do Carregamento *</Label>
              <Input type="date" value={dataCarregamento} onChange={(e) => setDataCarregamento(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Tipo Caminhão *</Label>
              <Select value={tipoCaminhao} onValueChange={setTipoCaminhao}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>{tiposCaminhao.map((t) => <SelectItem key={t.nome_tipo} value={t.nome_tipo}>{t.nome_tipo}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Motorista * (busca veículo vinculado)</Label>
              <MotoristaAutocomplete
                value={motorista}
                onChange={setMotorista}
                onSelect={(m) => {
                  if (m.placa) setPlaca(m.placa);
                  if (m.tipo_caminhao) setTipoCaminhao(m.tipo_caminhao);
                  if (m.transportadora) setTransportadora(m.transportadora);
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Placa *</Label>
              <CaminhaoAutocomplete
                value={placa}
                onChange={setPlaca}
                onSelect={(c) => {
                  setPlaca(c.placa);
                  if (c.motorista) setMotorista(c.motorista);
                  if (c.tipo_caminhao) setTipoCaminhao(c.tipo_caminhao);
                  if (c.transportadora) setTransportadora(c.transportadora);
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Transportadora</Label>
              <Input value={transportadora} onChange={(e) => setTransportadora(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Horário Previsto</Label>
              <Input type="time" value={horarioPrevisto} onChange={(e) => setHorarioPrevisto(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || submitting}>
            {submitting ? "Fechando carga..." : `Fechar Carga (${totalPedidos} pedidos)`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
