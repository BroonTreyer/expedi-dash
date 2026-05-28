import { useState, useEffect, useMemo, useCallback, lazy, Suspense, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Truck, MapPin, Package, Link2, LogIn, Clock, GripVertical, CalendarDays, Route } from "lucide-react";
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
import { useTabelasFrete, useTabelaFreteItens } from "@/hooks/useTabelasFrete";
import { calcularFreteTabela } from "@/lib/calcularFreteTabela";
import type { RotaVariante } from "./RoteirizacaoDialog";
import { FreteTabelaCard } from "./FreteTabelaCard";
import { Switch } from "@/components/ui/switch";

const RotaMap = lazy(() => import("./RotaMap").then((m) => ({ default: m.RotaMap })).catch(() => import("./RotaMap").then((m) => ({ default: m.RotaMap }))));

/* ─── Sortable destination row ─── */
function SortableDestRow({ id, group, idx, total, colorClass, ocValue, onOcChange }: {
  id: string; group: RotaGroup; idx: number; total: number; colorClass: string;
  ocValue?: string;
  onOcChange?: (v: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex flex-wrap items-center gap-2 px-2 py-1 rounded bg-muted/20 text-xs",
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
      {onOcChange && (
        <Input
          value={ocValue ?? ""}
          onChange={(e) => onOcChange(e.target.value)}
          placeholder="OC..."
          className="h-7 w-28 text-xs font-mono"
          onPointerDown={(e) => e.stopPropagation()}
        />
      )}
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
  /**
   * Quando definido, exibe o botão "Salvar pré-carga", que persiste todos os
   * campos preenchidos com `etapa = 'pre_carga'` sem fechar a carga. Validação
   * é relaxada (apenas exige pelo menos 1 pedido).
   */
  onSavePreCarga?: (updates: { id: string; tipo_caminhao: string | null; placa: string | null; motorista: string | null; transportadora: string | null; ordem_entrega: number; etapa: string; carga_id: string; data: string; horario_previsto?: string | null; nome_carga?: string | null; ordem_carga?: string | null }[], meta: { cargaId: string; isExisting: boolean }) => void;
  /**
   * Quando definido, exibe o botão "Roteirizar" no header do diálogo —
   * útil principalmente no fluxo de edição de pré-carga, que não passa
   * pela tela de Roteirização antes de abrir.
   */
  onRequestRoteirizar?: () => void;
}

export function FechamentoLoteDialog({ open, onOpenChange, items, tiposCaminhao, onSubmit, onPrintReady, selectedDate, roteirizacao, onSavePreCarga, onRequestRoteirizar }: Props) {
  const [tipoCaminhao, setTipoCaminhao] = useState("");
  const [placa, setPlaca] = useState("");
  const [motorista, setMotorista] = useState("");
  const origemEstavel = useMemo(() => ({ cidade: "Goiânia", uf: "GO" }), []);
  const [transportadora, setTransportadora] = useState("");
  const [horarioPrevisto, setHorarioPrevisto] = useState("");
  const [dataCarregamento, setDataCarregamento] = useState("");
  const [nomeCarga, setNomeCarga] = useState("");
  const [ordemCarga, setOrdemCarga] = useState("");
  const [modoOc, setModoOc] = useState<"unica" | "porGrupo">("unica");
  const [ordemCargaPorGrupo, setOrdemCargaPorGrupo] = useState<Record<string, string>>({});
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
    // Preservar a ordem salva (`ordem_entrega`) ao reabrir uma pré-carga: sem
    // isso, os grupos saem em ordem de iteração de `items` e a reordenação
    // gravada no banco "some" visualmente no próximo Editar.
    const itemsOrdenados = [...items].sort((a, b) => {
      const oa = (a as any).ordem_entrega ?? Number.POSITIVE_INFINITY;
      const ob = (b as any).ordem_entrega ?? Number.POSITIVE_INFINITY;
      if (oa !== ob) return oa - ob;
      return String(a.numero_pedido ?? "").localeCompare(String(b.numero_pedido ?? ""));
    });
    itemsOrdenados.forEach((c) => {
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
  // BUGFIX (ordem perdida): só sincronizar `groups` com `initialGroups` quando o
  // dialog ABRE. Se ressincronizássemos sempre que `initialGroups` mudasse,
  // qualquer refetch/realtime do parent (que muda o array `items`) destruiria a
  // reordenação que o usuário acabou de fazer dentro do dialog — exatamente o
  // bug onde "EDIVAR ROTA" voltava para a ordem antiga no romaneio.
  const wasOpenRef = useRef(false);
  useEffect(() => {
    if (open && !wasOpenRef.current) {
      setGroups(initialGroups);
      wasOpenRef.current = true;
    } else if (!open && wasOpenRef.current) {
      wasOpenRef.current = false;
    }
  }, [open, initialGroups]);

  // ── Estado local da rota — começa com o que veio da Roteirização e é
  // recalculado automaticamente sempre que o usuário reordena os destinos.
  const [routeGeometry, setRouteGeometry] = useState<[number, number][] | undefined>(roteirizacao?.routeGeometry);
  const [distanciaTotalLocal, setDistanciaTotalLocal] = useState<number | undefined>(roteirizacao?.distanciaTotal);
  const [trechosLocal, setTrechosLocal] = useState<any[] | undefined>(roteirizacao?.trechos as any);
  const [coordsCacheLocal, setCoordsCacheLocal] = useState<Map<string, { lat: number; lng: number }> | undefined>(roteirizacao?.coordsCache);
  const [tempoTotalLocal, setTempoTotalLocal] = useState<number | null | undefined>(roteirizacao?.tempoTotalMin);
  const [custoCombustivelLocal, setCustoCombustivelLocal] = useState<number | null | undefined>(roteirizacao?.custoCombustivel);
  const [isReroteirizando, setIsReroteirizando] = useState(false);
  const reqIdRef = useRef(0);
  const lastOrderKeyRef = useRef<string>("");
  const rerouteTimerRef = useRef<number | null>(null);
  // Variantes Rápida x Econômica
  const [rotaRapida, setRotaRapida] = useState<RotaVariante | null>(roteirizacao?.rotas?.rapida ?? null);
  const [rotaEconomica, setRotaEconomica] = useState<RotaVariante | null>(roteirizacao?.rotas?.economica ?? null);
  const [modoRota, setModoRota] = useState<"rapida" | "economica">(roteirizacao?.modoRotaEscolhido ?? "rapida");
  const [mostrarPedagios, setMostrarPedagios] = useState<boolean>(true);

  // Reset quando o dialog reabre com nova roteirização
  useEffect(() => {
    setRouteGeometry(roteirizacao?.routeGeometry);
    setDistanciaTotalLocal(roteirizacao?.distanciaTotal);
    setTrechosLocal(roteirizacao?.trechos as any);
    setCoordsCacheLocal(roteirizacao?.coordsCache);
    setTempoTotalLocal(roteirizacao?.tempoTotalMin);
    setCustoCombustivelLocal(roteirizacao?.custoCombustivel);
    setRotaRapida(roteirizacao?.rotas?.rapida ?? null);
    setRotaEconomica(roteirizacao?.rotas?.economica ?? null);
    setModoRota(roteirizacao?.modoRotaEscolhido ?? "rapida");
    lastOrderKeyRef.current = "";
  }, [roteirizacao]);

  // Sincroniza geometria atual com a variante selecionada
  useEffect(() => {
    const sel = modoRota === "economica" ? rotaEconomica : rotaRapida;
    if (!sel) return;
    setRouteGeometry(sel.geometria);
    setDistanciaTotalLocal(sel.distanciaTotal);
    setTrechosLocal(sel.trechos as any);
  }, [modoRota, rotaRapida, rotaEconomica]);
  const pedagiosAtual = useMemo(
    () => (modoRota === "economica" ? rotaEconomica?.pedagios : rotaRapida?.pedagios) ?? [],
    [modoRota, rotaRapida, rotaEconomica],
  );

  // Recalcula trajeto preservando a ordem atual dos destinos, sem apagar a
  // linha azul anterior — só substitui quando a nova resposta chega.
  const recalcRota = useCallback(async (silent = true) => {
    const destinos = groups
      .filter((g) => g.cidade && g.uf)
      .map((g) => ({ cidade: g.cidade!, uf: g.uf!, cliente: g.nomeCliente ?? "Sem cliente" }));
    if (destinos.length < 2) return;
    const reqId = ++reqIdRef.current;
    setIsReroteirizando(true);
    try {
      const { data, error } = await supabase.functions.invoke("roteirizar", {
        body: { destinos, origemCidade: "Goiânia", origemUf: "GO", preserveOrder: true, mode: "both" },
      });
      if (error) throw error;
      if (reqId !== reqIdRef.current) return;
      if (data.geometria && data.geometria.length > 0) setRouteGeometry(data.geometria);
      if (data.distanciaTotal != null) setDistanciaTotalLocal(data.distanciaTotal);
      if (data.trechos && data.trechos.length > 0) {
        setTrechosLocal(data.trechos);
        const dirigindo = (data.trechos as any[]).reduce((s: number, t: any) => s + (t.duracao || 0), 0);
        setTempoTotalLocal(dirigindo + destinos.length * 30);
      }
      if (data.rotas) {
        setRotaRapida(data.rotas.rapida ?? null);
        setRotaEconomica(data.rotas.economica ?? null);
      }
      if (data.ordemOtimizada && data.ordemOtimizada.length > 0) {
        const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();
        const c = new Map<string, { lat: number; lng: number }>();
        for (const opt of data.ordemOtimizada) {
          if (opt.lat != null && opt.lng != null && opt.cidade && opt.uf) {
            c.set(`${norm(opt.cidade as string)},${(opt.uf as string).toUpperCase().trim()}`, { lat: opt.lat, lng: opt.lng });
          }
        }
        if (data.origemLat != null && data.origemLng != null && data.origemCidadeNorm && data.origemUfNorm) {
          c.set(`${data.origemCidadeNorm},${data.origemUfNorm}`, { lat: data.origemLat, lng: data.origemLng });
        }
        if (c.size > 0) setCoordsCacheLocal(c);
      }
    } catch (e) {
      if (!silent) console.error("Falha ao recalcular trajeto", e);
    } finally {
      if (reqId === reqIdRef.current) setIsReroteirizando(false);
    }
  }, [groups]);

  // Auto-recalcular ao reordenar
  const orderKey = useMemo(
    () => groups.filter((g) => g.cidade && g.uf).map((g) => `${g.cidade}|${g.uf}|${g.codigoCliente ?? ""}`).join(">>"),
    [groups],
  );
  useEffect(() => {
    if (!open) return;
    if (!orderKey) return;
    // Primeira passagem: marca a ordem inicial como já roteirizada (veio da tela anterior)
    if (!lastOrderKeyRef.current) {
      lastOrderKeyRef.current = orderKey;
      return;
    }
    if (lastOrderKeyRef.current === orderKey) return;
    if (rerouteTimerRef.current) window.clearTimeout(rerouteTimerRef.current);
    rerouteTimerRef.current = window.setTimeout(() => {
      lastOrderKeyRef.current = orderKey;
      recalcRota(true);
    }, 350);
    return () => {
      if (rerouteTimerRef.current) window.clearTimeout(rerouteTimerRef.current);
    };
  }, [orderKey, open, recalcRota]);

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
      // Pré-preencher a partir do primeiro item — usado quando o dialog é
      // aberto para finalizar/editar uma pré-carga existente. Em uma carga
      // nova (itens vindos da seleção em "vendas"), os campos vêm null
      // mesmo e funcionam como reset.
      const first = items[0];
      setTipoCaminhao(first?.tipo_caminhao ?? "");
      setPlaca(first?.placa ?? "");
      setMotorista(first?.motorista ?? "");
      setTransportadora(first?.transportadora ?? "");
      setHorarioPrevisto(first?.horario_previsto ?? "");
      setNomeCarga(first?.nome_carga ?? "");
      setOrdemCarga(first?.ordem_carga ?? "");
      setModoOc("unica");
      setOrdemCargaPorGrupo({});
      setVeiculoVinculado("manual");
      setWalkInVinculadoId(null);
      setDataCarregamento(first?.data ?? selectedDate ?? new Date().toISOString().split("T")[0]);
    }
  }, [open, selectedDate, items]);

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

  const ocsPorGrupoValidas = useMemo(
    () => Object.values(ordemCargaPorGrupo).filter((v) => v.trim().length > 0).length,
    [ordemCargaPorGrupo],
  );
  const canSubmit = tipoCaminhao && placa && motorista && dataCarregamento && totalPedidos > 0 && (
    modoOc === "unica" ? ordemCarga.trim().length > 0 : ocsPorGrupoValidas > 0
  );

  // Submit guard: blocks double-clicks on "Fechar Carga" while the batch is in flight.
  // Without this, the user could trigger 2 simultaneous batch updates and create duplicate
  // carga_id rows + duplicate veiculos_esperados entries.
  const submitGuard = useRef<boolean>(false);
  const [submitting, setSubmitting] = useState(false);
  const [savingPre, setSavingPre] = useState(false);

  // Reset submitting ao reabrir o dialog
  useEffect(() => {
    if (open) setSubmitting(false);
  }, [open]);

  // Detecta se os itens já têm carga_id de pré-carga (modo edição/finalização).
  const existingPreCargaId = useMemo(() => {
    const id = items[0]?.carga_id;
    return id && id.startsWith("PRE-") ? id : null;
  }, [items]);

  const handleSavePreCarga = async () => {
    if (!onSavePreCarga) return;
    if (submitGuard.current || submitting || savingPre) return;
    if (totalPedidos === 0) return;
    submitGuard.current = true;
    setSavingPre(true);
    try {
      const cargaId = existingPreCargaId ?? (() => {
        const now = new Date();
        const dateStr = now.toISOString().split("T")[0].replace(/-/g, "");
        const timeStr = now.toTimeString().split(" ")[0].replace(/:/g, "").substring(0, 6);
        const rand = Math.random().toString(36).substring(2, 5).toUpperCase();
        return `PRE-${dateStr}-${timeStr}-${rand}`;
      })();
      const nomeCargaFinal = nomeCarga.trim() || null;
      const ocFallback = ordemCarga.trim();
      const ocPrimeiraValida = Object.values(ordemCargaPorGrupo).map(v => v.trim()).find(v => v.length > 0) ?? "";
      const updates = groups.flatMap((group, gIdx) => {
        const groupKey = group.codigoCliente ?? `__sem__${group.ordem}`;
        const ocGrupo = (ordemCargaPorGrupo[groupKey] ?? "").trim();
        const ocFinal = (modoOc === "unica" ? ocFallback : (ocGrupo || ocPrimeiraValida)) || null;
        return group.items.map((item) => ({
          id: item.id,
          tipo_caminhao: tipoCaminhao || null,
          placa: placa || null,
          motorista: motorista || null,
          transportadora: transportadora || null,
          // BUGFIX: usar índice atual do array (1..N) garante que a ordem salva
          // seja exatamente a ordem visual da lista no momento do save, mesmo
          // se `group.ordem` estiver defasado por algum re-render.
          ordem_entrega: gIdx + 1,
          etapa: "pre_carga",
          carga_id: cargaId,
          data: dataCarregamento,
          horario_previsto: horarioPrevisto || null,
          nome_carga: nomeCargaFinal,
          ordem_carga: ocFinal,
        }));
      });
      try {
        await Promise.resolve(
          onSavePreCarga(updates, { cargaId, isExisting: !!existingPreCargaId }) as any,
        );
        onOpenChange(false);
      } catch (e) {
        console.error("Pré-carga rejeitada pelo caller", e);
        // mantém o dialog aberto para o usuário reagir ao erro
      }
    } finally {
      submitGuard.current = false;
      setSavingPre(false);
    }
  };

  const handleSubmit = async () => {
    if (submitGuard.current || submitting) return;
    submitGuard.current = true;
    setSubmitting(true);
    try {
    // Guarda anti-duplicidade: se algum cliente desta seleção já está em uma
    // pré-carga ativa (e estes itens NÃO são a própria pré-carga sendo
    // finalizada), avisa o usuário e aborta para evitar SEIKOMAR-x2.
    if (!existingPreCargaId) {
      try {
        const clientes = Array.from(
          new Set(items.map((i) => i.codigo_cliente).filter((c): c is string => !!c)),
        );
        if (clientes.length > 0) {
          const { data: conflitos } = await supabase
            .from("carregamentos_dia")
            .select("codigo_cliente, cliente, nome_carga, carga_id")
            .eq("etapa", "pre_carga")
            .in("codigo_cliente", clientes);
          if (conflitos && conflitos.length > 0) {
            const nomes = Array.from(
              new Set(
                conflitos.map((c: any) => c.nome_carga || c.carga_id).filter(Boolean),
              ),
            ).slice(0, 3).join(", ");
            const cli = conflitos[0]?.cliente ?? "cliente";
            const ok = window.confirm(
              `Atenção: ${cli} já está em uma pré-carga ativa (${nomes}). ` +
              `Fechar uma nova carga vai criar duplicidade no painel.\n\n` +
              `Deseja continuar mesmo assim?`,
            );
            if (!ok) {
              submitGuard.current = false;
              setSubmitting(false);
              return;
            }
          }
        }
      } catch (e) {
        console.warn("Verificação anti-duplicidade falhou — seguindo", e);
      }
    }

    const now = new Date();
    const dateStr = now.toISOString().split("T")[0].replace(/-/g, "");
    const timeStr = now.toTimeString().split(" ")[0].replace(/:/g, "").substring(0, 6);
    const rand = Math.random().toString(36).substring(2, 5).toUpperCase();
    // ID interno sempre único (CG-...) — `nome_carga` é o rótulo amigável.
    // Bug histórico: usar `nomeCarga` como `cargaId` colidia com cargas
    // antigas homônimas (ex.: pré-carga "SEIKOMAR" → CG="SEIKOMAR" já
    // existente de outro dia) e bagunçava os triggers de `veiculos_esperados`.
    let cargaId = `CG-${dateStr}-${timeStr}-${rand}`;
    // Defesa extra: se por algum motivo já existir um registro com esse id,
    // sufixa -2, -3... (cobre relógios sincronizados em retries duplos).
    try {
      let suffix = 0;
      // Tenta até 5 vezes (caso raríssimo)
      while (suffix < 5) {
        const candidato = suffix === 0 ? cargaId : `${cargaId}-${suffix + 1}`;
        const { count } = await supabase
          .from("carregamentos_dia")
          .select("id", { count: "exact", head: true })
          .eq("carga_id", candidato);
        if ((count ?? 0) === 0) { cargaId = candidato; break; }
        suffix += 1;
      }
    } catch (e) {
      console.warn("Verificação anti-colisão de carga_id falhou — seguindo com id base", e);
    }
    const nomeCargaFinal = (nomeCarga && nomeCarga.trim()) || cargaId;

    const ocFallback = ordemCarga.trim();
    const ocPrimeiraValida =
      Object.values(ordemCargaPorGrupo).map((v) => v.trim()).find((v) => v.length > 0) ?? "";
    const updates = groups.flatMap((group, gIdx) => {
      const groupKey = group.codigoCliente ?? `__sem__${group.ordem}`;
      const ocGrupo = (ordemCargaPorGrupo[groupKey] ?? "").trim();
      const ocFinal = modoOc === "unica" ? ocFallback : (ocGrupo || ocPrimeiraValida);
      return group.items.map((item) => ({
        id: item.id,
        tipo_caminhao: tipoCaminhao,
        placa,
        motorista,
        transportadora,
        ordem_entrega: gIdx + 1,
        etapa: "logistica",
        carga_id: cargaId,
        data: dataCarregamento,
        ...(horarioPrevisto ? { horario_previsto: horarioPrevisto } : {}),
        nome_carga: nomeCargaFinal,
        ordem_carga: ocFinal,
      }));
    });
    const ocsDistintas = Array.from(new Set(updates.map((u) => u.ordem_carga).filter(Boolean)));
    const ordemCargaResumo = ocsDistintas.join(", ");
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

    // Aguarda o caller (page) terminar — o page é responsável por
    // chamar mutateAsync, mostrar toast e refetch. Se ele rejeitar,
    // mantemos o dialog aberto para o usuário tentar de novo.
    try {
      await Promise.resolve(
        onSubmit(updates, { cargaId, transportadora, placa, motorista, dataCarregamento, totalPeso, totalPedidos, destinos, ordemCarga: ordemCargaResumo }) as any,
      );
      onOpenChange(false);
    } catch (e) {
      console.error("Finalização rejeitada pelo caller", e);
      // não fecha o dialog
      return;
    }

    // Salva snapshot da rota planejada (km, custo, duração, ordem) para o histórico
    const kmFinal = distanciaTotalLocal ?? roteirizacao?.distanciaTotal;
    if (kmFinal && kmFinal > 0) {
      try {
        await upsertRotaExec.mutateAsync({
          carga_id: cargaId,
          data_referencia: dataCarregamento,
          km_planejado: kmFinal,
          custo_planejado: (custoCombustivelLocal ?? roteirizacao?.custoCombustivel) ?? null,
          duracao_planejada_min: (tempoTotalLocal ?? roteirizacao?.tempoTotalMin) ?? null,
          tipo_caminhao: roteirizacao?.tipoCaminhao ?? tipoCaminhao,
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
        groups: groups.map((g) => {
          const groupKey = g.codigoCliente ?? `__sem__${g.ordem}`;
          const ocGrupo = modoOc === "porGrupo"
            ? (ordemCargaPorGrupo[groupKey] ?? "").trim()
            : ordemCarga.trim();
          return {
            codigoCliente: g.codigoCliente,
            nomeCliente: g.nomeCliente,
            cidade: g.cidade ?? null,
            uf: g.uf ?? null,
            formaPagamento:
              (items.find((it) => it.codigo_cliente === g.codigoCliente) as any)?.forma_pagamento ?? null,
            items: g.items.map((i) => ({ id: i.id, nomeProduto: null, peso: i.peso, ruptura: i.ruptura })),
            pesoTotal: g.pesoTotal,
            rupturaCount: g.rupturaCount,
            ordem: g.ordem,
            ordemCarga: ocGrupo || null,
          };
        }),
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
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            {existingPreCargaId ? "Pré-carga em edição" : "Fechar Carga"}
          </DialogTitle>
          <DialogDescription>
            {existingPreCargaId
              ? "Revise os dados e finalize, ou salve novamente como pré-carga."
              : "Preencha os dados de transporte e confirme o fechamento — ou salve como pré-carga para finalizar depois."}
          </DialogDescription>
        </DialogHeader>

        {/* Summary */}
        <div className="flex flex-wrap items-center gap-3 px-3 py-2 rounded-lg bg-muted/30 border border-border text-sm">
          <div className="flex items-center gap-1.5 font-medium">
            <Package className="h-4 w-4 text-primary" />
            <span>{totalPedidos} pedidos</span>
          </div>
          {totalRuptura > 0 && (
            <span className="font-medium">{(totalPeso + totalRuptura).toLocaleString("pt-BR")} kg total</span>
          )}
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
                  const groupKey = g.codigoCliente ?? `__sem__${g.ordem}`;
                  return (
                    <SortableDestRow
                      key={dndKey(g)}
                      id={dndKey(g)}
                      group={g}
                      idx={idx}
                      total={groups.length}
                      colorClass={colorClass}
                      ocValue={modoOc === "porGrupo" ? (ordemCargaPorGrupo[groupKey] ?? "") : undefined}
                      onOcChange={modoOc === "porGrupo"
                        ? (v) => setOrdemCargaPorGrupo((p) => ({ ...p, [groupKey]: v }))
                        : undefined}
                    />
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
              routeGeometry={routeGeometry}
              distanciaTotal={distanciaTotalLocal}
              trechos={trechosLocal as any}
              loading={isReroteirizando}
              coordsCache={coordsCacheLocal}
              custoCombustivel={custoCombustivelLocal ?? null}
              tipoCaminhaoLabel={roteirizacao?.tipoCaminhao ?? null}
              tempoTotalMin={tempoTotalLocal ?? null}
              onReorder={handleReorder}
              pedagios={mostrarPedagios ? pedagiosAtual : []}
            />
          </Suspense>
        )}

        <div className="flex flex-wrap items-center gap-2 px-1">
            <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Trajeto:</span>
            <Button type="button" size="sm" variant={modoRota === "rapida" ? "default" : "outline"}
              className="h-7 text-xs" onClick={() => setModoRota("rapida")} disabled={!rotaRapida}>
              ⚡ Mais Rápida
              {rotaRapida ? (
                <span className="ml-1.5 opacity-80">{rotaRapida.distanciaTotal.toLocaleString("pt-BR")} km · {rotaRapida.duracaoMin} min · {rotaRapida.pedagios.length} ped.</span>
              ) : (
                <span className="ml-1.5 opacity-60">{isReroteirizando ? "calculando..." : "indisponível"}</span>
              )}
            </Button>
            <Button type="button" size="sm" variant={modoRota === "economica" ? "default" : "outline"}
              className="h-7 text-xs" onClick={() => setModoRota("economica")} disabled={!rotaEconomica}>
              💰 Mais Econômica
              {rotaEconomica ? (
                <span className="ml-1.5 opacity-80">{rotaEconomica.distanciaTotal.toLocaleString("pt-BR")} km · {rotaEconomica.duracaoMin} min · {rotaEconomica.pedagios.length} ped.</span>
              ) : (
                <span className="ml-1.5 opacity-60">{isReroteirizando ? "calculando..." : "indisponível"}</span>
              )}
            </Button>
            <div className="ml-auto flex items-center gap-2">
              <Label htmlFor="toggle-pedagios-fech" className="text-[11px] uppercase tracking-wide text-muted-foreground cursor-pointer">Pedágios</Label>
              <Switch id="toggle-pedagios-fech" checked={mostrarPedagios} onCheckedChange={setMostrarPedagios} />
            </div>
        </div>

        <FreteTabelaCard groups={groups} tipoCaminhao={tipoCaminhao} />

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

        {/* Campo destacado — Data do Carregamento (preenchido pelo Faturamento), fora dos cards */}
        <div className="space-y-1.5 pt-1">
          <Label
            htmlFor="data-carregamento-destaque"
            className="flex items-center gap-2 text-sm font-semibold"
          >
            <CalendarDays className="h-4 w-4 text-primary" />
            Data do Carregamento <span className="text-destructive">*</span>
            <span className="ml-auto text-[11px] font-normal text-muted-foreground">
              Preenchido pelo Faturamento — pode ser alterada a qualquer momento
            </span>
          </Label>
          <Input
            id="data-carregamento-destaque"
            type="date"
            value={dataCarregamento}
            onChange={(e) => setDataCarregamento(e.target.value)}
            className={`h-11 text-base font-medium ${!dataCarregamento ? "border-destructive" : ""}`}
          />
          {!dataCarregamento && (
            <p className="text-[11px] text-destructive font-medium">Obrigatório.</p>
          )}
        </div>

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
              <div className="flex items-center justify-between gap-2">
                <Label className="text-xs">Ordem de Carga *</Label>
                <div className="inline-flex rounded-md border p-0.5 bg-muted/40">
                  <Button type="button" variant={modoOc === "unica" ? "default" : "ghost"} size="sm"
                    className="h-6 px-2 text-[10px]" onClick={() => setModoOc("unica")}>Única</Button>
                  <Button type="button" variant={modoOc === "porGrupo" ? "default" : "ghost"} size="sm"
                    className="h-6 px-2 text-[10px]" onClick={() => setModoOc("porGrupo")}>Por grupo</Button>
                </div>
              </div>
              {modoOc === "unica" ? (
                <>
                  <Input
                    value={ordemCarga}
                    onChange={(e) => setOrdemCarga(e.target.value)}
                    placeholder="Ex: OC-1234"
                  />
                  <p className="text-[10px] text-muted-foreground">Mesma OC para todos os pedidos da carga.</p>
                </>
              ) : (
                <p className="text-[10px] text-muted-foreground">
                  Preencha a OC ao lado de cada destino na lista acima ({ocsPorGrupoValidas} de {groups.length} preenchidas).
                </p>
              )}
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
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting || savingPre}>Cancelar</Button>
          {onSavePreCarga && (
            <Button
              variant="secondary"
              onClick={handleSavePreCarga}
              disabled={totalPedidos === 0 || submitting || savingPre}
            >
              {savingPre ? "Salvando..." : existingPreCargaId ? "Atualizar pré-carga" : "Salvar pré-carga"}
            </Button>
          )}
          <Button onClick={handleSubmit} disabled={!canSubmit || submitting || savingPre}>
            {submitting
              ? (existingPreCargaId ? "Finalizando…" : "Fechando carga…")
              : `${existingPreCargaId ? "Finalizar Carga" : "Fechar Carga"} (${totalPedidos} pedidos)`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
