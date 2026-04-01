import { useState, useEffect, useMemo, useCallback, lazy, Suspense, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Truck, MapPin, Package, Link2 } from "lucide-react";
import { MotoristaAutocomplete } from "@/components/portaria/MotoristaAutocomplete";
import { CaminhaoAutocomplete } from "@/components/portaria/CaminhaoAutocomplete";
import { cn } from "@/lib/utils";
import { useVeiculosEsperados } from "@/hooks/useVeiculosEsperados";
import { useMovimentacoes } from "@/hooks/useMovimentacoesPortaria";
import type { Carregamento } from "@/hooks/useCarregamentos";
import type { CargaPrintData } from "./CargaPrintDialog";
import type { RoteirizacaoResult, RotaGroup } from "./RoteirizacaoDialog";

const RotaMap = lazy(() => import("./RotaMap").then((m) => ({ default: m.RotaMap })).catch(() => import("./RotaMap").then((m) => ({ default: m.RotaMap }))));

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: Carregamento[];
  tiposCaminhao: { nome_tipo: string }[];
  onSubmit: (updates: { id: string; tipo_caminhao: string; placa: string; motorista: string; transportadora: string; ordem_entrega: number; etapa: string; carga_id: string; data: string; horario_previsto?: string; nome_carga?: string }[], meta: { cargaId: string; transportadora: string; placa: string; motorista: string; dataCarregamento: string; totalPeso: number; totalPedidos: number; destinos: string }) => void;
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
  const [veiculoVinculado, setVeiculoVinculado] = useState("manual");

  // Fetch veículos esperados e no pátio
  const dataRef = dataCarregamento || selectedDate || new Date().toISOString().split("T")[0];
  const { data: veiculosEsperados = [] } = useVeiculosEsperados(dataRef);
  const { data: movimentacoes = [] } = useMovimentacoes(dataRef);

  // Veículos no pátio (entradas sem saída vinculada)
  const veiculosPatio = useMemo(() => {
    const saidasVinculadas = new Set(
      movimentacoes.filter((m) => m.tipo_movimento === "saida" && m.movimento_vinculado_id).map((m) => m.movimento_vinculado_id)
    );
    return movimentacoes.filter((m) => {
      if (m.tipo_movimento !== "entrada") return false;
      if (saidasVinculadas.has(m.id)) return false;
      if (m.categoria === "terceirizado" && m.etapa_terceirizado === "finalizado") return false;
      return true;
    });
  }, [movimentacoes]);

  // Lista combinada de opções
  const veiculosDisponiveis = useMemo(() => {
    const opcoes: { id: string; label: string; tipo: "esperado" | "patio"; placa: string; motorista: string; transportadora: string; tipoCaminhao: string }[] = [];
    veiculosEsperados.filter((v) => !v.conferido).forEach((v) => {
      opcoes.push({
        id: `esp-${v.id}`,
        label: `[Esperado] ${v.placa}${v.motorista ? ` - ${v.motorista}` : ""}`,
        tipo: "esperado",
        placa: v.placa,
        motorista: v.motorista || "",
        transportadora: v.transportadora || "",
        tipoCaminhao: v.tipo_veiculo || "",
      });
    });
    veiculosPatio.forEach((v) => {
      opcoes.push({
        id: `pat-${v.id}`,
        label: `[Pátio] ${v.placa || "S/P"}${v.motorista ? ` - ${v.motorista}` : ""}`,
        tipo: "patio",
        placa: v.placa || "",
        motorista: v.motorista || "",
        transportadora: v.empresa || "",
        tipoCaminhao: v.tipo_caminhao || "",
      });
    });
    return opcoes;
  }, [veiculosEsperados, veiculosPatio]);

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
      setVeiculoVinculado("manual");
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
      }))
    );
    const destinos = groups.filter(g => g.cidade).map(g => `${g.cidade}/${g.uf}`).join(", ");
    onSubmit(updates, { cargaId, transportadora, placa, motorista, dataCarregamento, totalPeso, totalPedidos, destinos });
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
            // BUG 20 FIX: Format with locale number separator
            <span className="font-medium">{roteirizacao.distanciaTotal.toLocaleString("pt-BR")} km</span>
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
            />
          </Suspense>
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
              <Label className="text-xs">Placa * (busca caminhão cadastrado)</Label>
              <CaminhaoAutocomplete
                value={placa}
                onChange={setPlaca}
                onSelect={(c) => {
                  setPlaca(c.placa);
                  if (c.tipo_caminhao) setTipoCaminhao(c.tipo_caminhao);
                  if (c.motorista) setMotorista(c.motorista);
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Motorista *</Label>
              <MotoristaAutocomplete value={motorista} onChange={setMotorista} />
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
