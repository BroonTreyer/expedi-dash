import { useState, useEffect, useMemo, useCallback, lazy, Suspense, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Truck, MapPin, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Carregamento } from "@/hooks/useCarregamentos";
import type { CargaPrintData } from "./CargaPrintDialog";
import type { RoteirizacaoResult, RotaGroup } from "./RoteirizacaoDialog";

const RotaMap = lazy(() => import("./RotaMap").then((m) => ({ default: m.RotaMap })));

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: Carregamento[];
  tiposCaminhao: { nome_tipo: string }[];
  onSubmit: (updates: { id: string; tipo_caminhao: string; placa: string; motorista: string; transportadora: string; ordem_entrega: number; etapa: string; carga_id: string; data: string; horario_previsto?: string; nome_carga?: string }[]) => void;
  onPrintReady?: (data: CargaPrintData) => void;
  selectedDate?: string;
  roteirizacao?: RoteirizacaoResult | null;
}

export function FechamentoLoteDialog({ open, onOpenChange, items, tiposCaminhao, onSubmit, onPrintReady, selectedDate, roteirizacao }: Props) {
  const [tipoCaminhao, setTipoCaminhao] = useState("");
  const [placa, setPlaca] = useState("");
  const [motorista, setMotorista] = useState("");
  const [transportadora, setTransportadora] = useState("");
  const [horarioPrevisto, setHorarioPrevisto] = useState("");
  const [dataCarregamento, setDataCarregamento] = useState("");
  const [nomeCarga, setNomeCarga] = useState("");

  // Use groups from roteirizacao if available, otherwise build from items
  const groups: RotaGroup[] = useMemo(() => {
    if (roteirizacao?.groups && roteirizacao.groups.length > 0) {
      return roteirizacao.groups;
    }
    const map = new Map<string, RotaGroup>();
    items.forEach((c) => {
      const key = c.codigo_cliente ?? "__sem_cliente__";
      if (!map.has(key)) {
        map.set(key, { codigoCliente: c.codigo_cliente, nomeCliente: c.cliente, cidade: c.cidade, uf: c.uf, items: [], pesoTotal: 0, ordem: 0 });
      }
      const g = map.get(key)!;
      g.items.push({ id: c.id, peso: c.peso ?? 0, numeroPedido: c.numero_pedido });
      g.pesoTotal += c.peso ?? 0;
    });
    return Array.from(map.values()).map((g, idx) => ({ ...g, ordem: idx + 1 }));
  }, [roteirizacao, items]);

  useEffect(() => {
    if (open) {
      setTipoCaminhao("");
      setPlaca("");
      setMotorista("");
      setTransportadora("");
      setHorarioPrevisto("");
      setNomeCarga("");
      setDataCarregamento(selectedDate ?? new Date().toISOString().split("T")[0]);
    }
  }, [open, selectedDate]);

  const totalPeso = useMemo(() => groups.reduce((s, g) => s + g.pesoTotal, 0), [groups]);
  const totalPedidos = useMemo(() => groups.reduce((s, g) => s + g.items.length, 0), [groups]);
  const ufsUnicas = useMemo(() => { const set = new Set<string>(); groups.forEach((g) => { if (g.uf) set.add(g.uf); }); return Array.from(set).sort(); }, [groups]);

  const canSubmit = tipoCaminhao && placa && motorista && dataCarregamento && totalPedidos > 0;

  const handleSubmit = () => {
    const now = new Date();
    const dateStr = now.toISOString().split("T")[0].replace(/-/g, "");
    const timeStr = now.toTimeString().split(" ")[0].replace(/:/g, "").substring(0, 6);
    const rand = Math.random().toString(36).substring(2, 5).toUpperCase();
    const cargaId = nomeCarga || `CG-${dateStr}-${timeStr}-${rand}`;

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
        ...(nomeCarga ? { nome_carga: nomeCarga } : {}),
      }))
    );
    onSubmit(updates);
    onOpenChange(false);

    if (onPrintReady) {
      onPrintReady({
        cargaId,
        data: dataCarregamento,
        tipoCaminhao,
        placa,
        motorista,
        transportadora: transportadora || undefined,
        horarioPrevisto: horarioPrevisto || undefined,
        groups: groups.map((g) => ({
          codigoCliente: g.codigoCliente,
          nomeCliente: g.nomeCliente,
          items: g.items.map((i) => ({ id: i.id, nomeProduto: null, peso: i.peso })),
          pesoTotal: g.pesoTotal,
          ordem: g.ordem,
        })),
        totalPeso,
        totalPedidos,
      });
    }
  };

  const rotaDestinos = useMemo(
    () => groups.filter((g) => g.cidade && g.uf).map((g) => ({ ordem: g.ordem, cliente: g.nomeCliente ?? "Sem cliente", cidade: g.cidade!, uf: g.uf! })),
    [groups]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
          <span className="text-muted-foreground">{totalPeso.toLocaleString("pt-BR")} kg</span>
          {roteirizacao?.distanciaTotal != null && roteirizacao.distanciaTotal > 0 && (
            <span className="font-medium">{roteirizacao.distanciaTotal} km</span>
          )}
          <div className="flex gap-1 flex-wrap">
            {ufsUnicas.map((uf) => <Badge key={uf} variant="secondary" className="text-xs font-bold">{uf}</Badge>)}
          </div>
        </div>

        {/* Destinations summary (compact) */}
        <div className="space-y-1">
          {groups.map((g, idx) => {
            const type = idx === 0 ? "text-green-600" : idx === groups.length - 1 ? "text-red-500" : "text-primary";
            return (
              <div key={g.codigoCliente ?? idx} className="flex items-center gap-2 px-2 py-1 rounded bg-muted/20 text-xs">
                <span className={cn("font-bold w-5 text-center", type)}>{g.ordem}</span>
                <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                <span className="truncate flex-1">{g.nomeCliente ?? "Sem cliente"} – {g.cidade}{g.uf ? `/${g.uf}` : ""}</span>
                <span className="font-mono text-muted-foreground">{g.pesoTotal.toLocaleString("pt-BR")} kg</span>
              </div>
            );
          })}
        </div>

        {/* BUG 8: Show map whenever there are destinations with city/uf, even without route geometry */}
        {rotaDestinos.length > 0 && (
          <Suspense fallback={<div className="h-[200px] rounded-lg border border-border bg-muted/20 flex items-center justify-center text-sm text-muted-foreground animate-pulse">Carregando mapa...</div>}>
            <RotaMap
              destinos={rotaDestinos}
              origem={{ cidade: "Goiânia", uf: "GO" }}
              routeGeometry={roteirizacao?.routeGeometry}
              distanciaTotal={roteirizacao?.distanciaTotal}
              trechos={roteirizacao?.trechos}
            />
          </Suspense>
        )}

        {/* Transport fields */}
        <div className="border-t border-border pt-3">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">Dados de Transporte</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Nome da Carga</Label>
              <Input value={nomeCarga} onChange={(e) => setNomeCarga(e.target.value)} placeholder="Ex: Carga MG Norte (opcional)" />
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
              <Label className="text-xs">Placa *</Label>
              <Input value={placa} onChange={(e) => setPlaca(e.target.value.toUpperCase())} placeholder="ABC1D23" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Motorista *</Label>
              <Input value={motorista} onChange={(e) => setMotorista(e.target.value)} />
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
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            Fechar Carga ({totalPedidos} pedidos)
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
