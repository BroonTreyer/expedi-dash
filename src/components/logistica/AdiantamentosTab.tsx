import { Fragment, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, XCircle, Wallet, CheckCircle2, ListChecks, CalendarIcon, ChevronRight, ChevronDown, Trash2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { useCtesDacte, type CteDacteRow } from "@/hooks/useCtesDacte";
import {
  useAdiantamentos,
  useCtesEmAdiantamento,
  useCriarAdiantamento,
  useCancelarAdiantamento,
  useMarcarAdiantamentoPago,
  useAtualizarDataAdiantamento,
  useDeleteAdiantamentosComCtes,
  type Adiantamento,
} from "@/hooks/useAdiantamentos";
import { useDeleteCtesByIds } from "@/hooks/useCtesDacte";
import { useTransportadorasFinanceiro } from "@/hooks/useTransportadorasFinanceiro";
import { useValoresTabelaPorCte } from "@/hooks/useValoresTabelaPorCte";
import { ComprovanteAdiantamentoDialog } from "./ComprovanteAdiantamentoDialog";
import { RegistrarQuitacaoDialog } from "./RegistrarQuitacaoDialog";
import { toast } from "sonner";

const fmtBRL = (n: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n || 0);
const fmtKg = (n: number) => new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(n || 0);
const fmtRkg = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(n || 0);
const fmtPct = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(1).replace(".", ",")}%`;
const fmtDate = (s: string | null) => (s ? new Date(s).toLocaleDateString("pt-BR") : "—");

function StatusBadge({ s }: { s: Adiantamento["status"] }) {
  const map: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    pendente: "outline",
    pago: "default",
    quitado: "secondary",
    cancelado: "destructive",
  };
  const label: Record<string, string> = { pendente: "Pendente", pago: "Pago", quitado: "Quitado", cancelado: "Cancelado" };
  return <Badge variant={map[s]}>{label[s]}</Badge>;
}

function DataCell({ adiantamento }: { adiantamento: Adiantamento }) {
  const atualizar = useAtualizarDataAdiantamento();
  const [open, setOpen] = useState(false);
  const current = adiantamento.created_at ? new Date(adiantamento.created_at) : new Date();
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1 font-normal">
          <CalendarIcon className="h-3 w-3" />
          {fmtDate(adiantamento.created_at)}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={current}
          onSelect={(d) => {
            if (!d) return;
            const merged = new Date(d);
            merged.setHours(current.getHours(), current.getMinutes(), current.getSeconds(), current.getMilliseconds());
            atualizar.mutate({ id: adiantamento.id, created_at: merged.toISOString() });
            setOpen(false);
          }}
          initialFocus
          className={cn("p-3 pointer-events-auto")}
        />
      </PopoverContent>
    </Popover>
  );
}

export function AdiantamentosTab() {
  const { data: ctes = [] } = useCtesDacte();
  const { data: ctesAtivos } = useCtesEmAdiantamento();
  const { data: transp = [] } = useTransportadorasFinanceiro();
  const { data: adiantamentos = [] } = useAdiantamentos();
  const criar = useCriarAdiantamento();
  const cancelar = useCancelarAdiantamento();
  const marcarPago = useMarcarAdiantamentoPago();
  const apagarAdts = useDeleteAdiantamentosComCtes();
  const apagarCtes = useDeleteCtesByIds();

  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [percentuais, setPercentuais] = useState<Record<string, number>>({});
  const [adtManuais, setAdtManuais] = useState<Record<string, number>>({});
  // Modo de geração por transportadora: 'individual' (1 ADT por CT-e) ou 'lote' (1 ADT agrupado)
  const [modos, setModos] = useState<Record<string, "individual" | "lote">>({});
  const [observacoes, setObservacoes] = useState("");
  const [dataAdiantamento, setDataAdiantamento] = useState<Date>(new Date());

  const [comprovantesAdt, setComprovantesAdt] = useState<Adiantamento[]>([]);
  const [quitarTransp, setQuitarTransp] = useState<string | null>(null);

  // Seleção de lotes para baixa em lote
  const [selPendentes, setSelPendentes] = useState<Set<string>>(new Set());
  const [selPagos, setSelPagos] = useState<Set<string>>(new Set());
  const [selQuitados, setSelQuitados] = useState<Set<string>>(new Set());

  // CT-es disponíveis (sem adiantamento ativo) agrupados por transportadora
  const ctesPorTransp = useMemo(() => {
    const map = new Map<string, CteDacteRow[]>();
    for (const c of ctes) {
      if (!c.transportadora) continue;
      if (ctesAtivos?.has(c.id)) continue;
      if (!map.has(c.transportadora)) map.set(c.transportadora, []);
      map.get(c.transportadora)!.push(c);
    }
    return new Map([...map.entries()].sort((a, b) => a[0].localeCompare(b[0])));
  }, [ctes, ctesAtivos]);

  // Apenas CT-es selecionáveis (disponíveis) para buscar valores de tabela
  const ctesDisponiveis = useMemo(
    () => [...ctesPorTransp.values()].flat(),
    [ctesPorTransp],
  );
  const { data: tabelaMap } = useValoresTabelaPorCte(ctesDisponiveis);

  const transpInfoByName = useMemo(() => {
    const m = new Map<string, (typeof transp)[number]>();
    for (const t of transp) m.set(t.nome, t);
    return m;
  }, [transp]);

  const getPercentual = (nome: string) => {
    if (percentuais[nome] !== undefined) return percentuais[nome];
    return Number(transpInfoByName.get(nome)?.percentual_adiantamento_padrao ?? 50);
  };
  const setPerc = (nome: string, v: number) => setPercentuais((p) => ({ ...p, [nome]: v }));
  const getModo = (nome: string): "individual" | "lote" => modos[nome] ?? "individual";
  const setModo = (nome: string, m: "individual" | "lote") =>
    setModos((p) => ({ ...p, [nome]: m }));

  // Resumo por transportadora (apenas as com seleção)
  const resumoPorTransp = useMemo(() => {
    const arr: Array<{
      nome: string;
      ctes: CteDacteRow[];
      total: number;
      peso: number;
      totalTabela: number;
      percentual: number;
      adt: number;
      saldo: number;
      manual: boolean;
    }> = [];
    for (const [nome, lista] of ctesPorTransp.entries()) {
      const escolhidos = lista.filter((c) => selecionados.has(c.id));
      if (escolhidos.length === 0) continue;
      const total = escolhidos.reduce((s, c) => s + Number(c.valor_frete || 0), 0);
      const peso = escolhidos.reduce((s, c) => s + Number(c.peso_total || 0), 0);
      const totalTabela = escolhidos.reduce(
        (s, c) => s + (tabelaMap?.get(c.id)?.valorTabela ?? 0),
        0,
      );
      const p = getPercentual(nome);
      const calc = +(total * (p / 100)).toFixed(2);
      const manualVal = adtManuais[nome];
      const manual = manualVal !== undefined && !Number.isNaN(manualVal);
      const adt = manual ? +Number(manualVal).toFixed(2) : calc;
      const percentualEfetivo = total > 0 ? +((adt / total) * 100).toFixed(2) : p;
      arr.push({
        nome,
        ctes: escolhidos,
        total,
        peso,
        totalTabela,
        percentual: manual ? percentualEfetivo : p,
        adt,
        saldo: +(total - adt).toFixed(2),
        manual,
      });
    }
    return arr;
  }, [ctesPorTransp, selecionados, percentuais, transpInfoByName, tabelaMap, adtManuais]);

  const totaisGerais = useMemo(
    () =>
      resumoPorTransp.reduce(
        (acc, r) => ({
          ctes: acc.ctes + r.ctes.length,
          total: acc.total + r.total,
          peso: acc.peso + r.peso,
          totalTabela: acc.totalTabela + r.totalTabela,
          adt: acc.adt + r.adt,
          saldo: acc.saldo + r.saldo,
        }),
        { ctes: 0, total: 0, peso: 0, totalTabela: 0, adt: 0, saldo: 0 },
      ),
    [resumoPorTransp],
  );

  const toggle = (id: string) =>
    setSelecionados((p) => {
      const n = new Set(p);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  const toggleMany = (rows: CteDacteRow[]) =>
    setSelecionados((p) => {
      const n = new Set(p);
      const allIn = rows.every((r) => n.has(r.id));
      if (allIn) rows.forEach((r) => n.delete(r.id));
      else rows.forEach((r) => n.add(r.id));
      return n;
    });

  const totalAdtsAGerar = useMemo(
    () =>
      resumoPorTransp.reduce(
        (s, r) => s + (getModo(r.nome) === "individual" ? r.ctes.length : 1),
        0,
      ),
    [resumoPorTransp, modos],
  );

  const handleGerar = async () => {
    if (resumoPorTransp.length === 0) return;
    const criados: Adiantamento[] = [];
    try {
      for (const r of resumoPorTransp) {
        const now = new Date();
        const merged = new Date(dataAdiantamento);
        merged.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
        const modo = getModo(r.nome);
        if (modo === "individual") {
          // 1 adiantamento por CT-e
          for (const c of r.ctes) {
            const valorCte = Number(c.valor_frete || 0);
            const oc = (c.ordem_carga ?? "").trim() || null;
            // Se houver override manual no card, rateia proporcional ao valor do CT-e
            const override = r.manual && r.total > 0
              ? +((valorCte / r.total) * r.adt).toFixed(2)
              : null;
            const novo = await criar.mutateAsync({
              transportadora: r.nome,
              transportadora_id: transpInfoByName.get(r.nome)?.id ?? null,
              tipo_agrupamento: "ordem",
              ordem_carga: oc,
              percentual: r.percentual,
              observacoes: observacoes.trim() || null,
              valor_adiantamento_override: override,
              created_at: merged.toISOString(),
              ctes: [{
                id: c.id,
                valor_frete: valorCte,
                peso_total: Number(c.peso_total || 0),
              }],
            });
            criados.push(novo);
          }
        } else {
          const ocs = new Set(r.ctes.map((c) => (c.ordem_carga ?? "").trim()).filter(Boolean));
          const tipo: "ordem" | "lote" = ocs.size === 1 ? "ordem" : "lote";
          const ordem = tipo === "ordem" ? [...ocs][0] : null;
          const novo = await criar.mutateAsync({
            transportadora: r.nome,
            transportadora_id: transpInfoByName.get(r.nome)?.id ?? null,
            tipo_agrupamento: tipo,
            ordem_carga: ordem,
            percentual: r.percentual,
            observacoes: observacoes.trim() || null,
            valor_adiantamento_override: r.manual ? r.adt : null,
            created_at: merged.toISOString(),
            ctes: r.ctes.map((c) => ({
              id: c.id,
              valor_frete: Number(c.valor_frete || 0),
              peso_total: Number(c.peso_total || 0),
            })),
          });
          criados.push(novo);
        }
      }
      setSelecionados(new Set());
      setObservacoes("");
      setAdtManuais({});
      setDataAdiantamento(new Date());
      if (criados.length > 0) setComprovantesAdt(criados);
    } catch {
      // toast já é exibido pelo hook
    }
  };

  const pendentes = adiantamentos.filter((a) => a.status === "pendente");
  const pagos = adiantamentos.filter((a) => a.status === "pago");
  const quitados = adiantamentos.filter((a) => a.status === "quitado");

  // Para o dialog de quitação: agrupa pagos por transportadora
  const pagosPorTransp = useMemo(() => {
    const m = new Map<string, Adiantamento[]>();
    for (const a of pagos) {
      if (!m.has(a.transportadora)) m.set(a.transportadora, []);
      m.get(a.transportadora)!.push(a);
    }
    return m;
  }, [pagos]);

  const adiantamentosParaQuitar = quitarTransp ? pagosPorTransp.get(quitarTransp) ?? [] : [];

  // Total Adt dos pendentes selecionados
  const totalAdtSelPend = useMemo(
    () => pendentes.filter((a) => selPendentes.has(a.id)).reduce((s, a) => s + Number(a.valor_adiantamento || 0), 0),
    [pendentes, selPendentes],
  );

  const togglePend = (id: string) =>
    setSelPendentes((p) => {
      const n = new Set(p);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  const togglePago = (id: string) =>
    setSelPagos((p) => {
      const n = new Set(p);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const handleMarcarPagoLote = () => {
    const selecionados = pendentes.filter((a) => selPendentes.has(a.id));
    if (selecionados.length === 0) return;
    setComprovantesAdt(selecionados);
  };

  const handleApagarCtesSelecionados = () => {
    const ids = [...selecionados];
    if (ids.length === 0) return;
    if (!confirm(`Apagar ${ids.length} CT-e(s) selecionado(s)? Esta ação não pode ser desfeita.`)) return;
    apagarCtes.mutate(ids, { onSuccess: () => setSelecionados(new Set()) });
  };

  const apagarAdtsLote = (lista: Adiantamento[], onDone: () => void) => {
    if (lista.length === 0) return;
    const totalCtes = lista.reduce((s, a) => s + Number(a.qtd_ctes || 0), 0);
    if (!confirm(
      `Apagar ${lista.length} adiantamento(s) e os ${totalCtes} CT-e(s) vinculados? Esta ação não pode ser desfeita.`,
    )) return;
    apagarAdts.mutate(lista.map((a) => a.id), { onSuccess: onDone });
  };

  return (
    <div className="space-y-4">
      <Tabs defaultValue="montar" className="space-y-4">
        <TabsList>
          <TabsTrigger value="montar"><ListChecks className="h-4 w-4 mr-2" />Montar Lote</TabsTrigger>
          <TabsTrigger value="pendentes">Pendentes ({pendentes.length})</TabsTrigger>
          <TabsTrigger value="pagos"><Wallet className="h-4 w-4 mr-2" />Aguardando Quitação ({pagos.length})</TabsTrigger>
          <TabsTrigger value="quitados"><CheckCircle2 className="h-4 w-4 mr-2" />Quitados ({quitados.length})</TabsTrigger>
        </TabsList>

        {/* MONTAR LOTE */}
        <TabsContent value="montar">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-4">
            <div className="space-y-3">
              {ctesPorTransp.size === 0 ? (
                <Card className="p-8 text-center text-sm text-muted-foreground">
                  Nenhum CT-e pendente de adiantamento.
                </Card>
              ) : (
                [...ctesPorTransp.entries()].map(([nome, lista]) => {
                  const info = transpInfoByName.get(nome);
                  const selCount = lista.filter((c) => selecionados.has(c.id)).length;
                  const allIn = lista.every((c) => selecionados.has(c.id));
                  const grupos = (() => {
                    const m = new Map<string, CteDacteRow[]>();
                    for (const c of lista) {
                      const k = (c.ordem_carga ?? "").trim() || "__sem_oc__";
                      if (!m.has(k)) m.set(k, []);
                      m.get(k)!.push(c);
                    }
                    return [...m.entries()].sort((a, b) => (a[0] === "__sem_oc__" ? 1 : -1));
                  })();
                  return (
                    <Card key={nome} className="p-4 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Checkbox checked={allIn} onCheckedChange={() => toggleMany(lista)} />
                          <h3 className="font-semibold">{nome}</h3>
                          <Badge variant="outline" className="text-xs">{lista.length} CT-e</Badge>
                          {selCount > 0 && (
                            <Badge className="text-xs">{selCount} selecionado{selCount > 1 ? "s" : ""}</Badge>
                          )}
                          {!info && (
                            <span className="text-xs text-amber-600">
                              Sem cadastro financeiro. <a href="/transportadoras" className="underline">Cadastrar</a>
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1.5 mr-2 rounded-md border px-2 py-1">
                            <span className={`text-xs ${getModo(nome) === "individual" ? "font-semibold" : "text-muted-foreground"}`}>Individual</span>
                            <Switch
                              checked={getModo(nome) === "lote"}
                              onCheckedChange={(v) => setModo(nome, v ? "lote" : "individual")}
                            />
                            <span className={`text-xs ${getModo(nome) === "lote" ? "font-semibold" : "text-muted-foreground"}`}>Lote</span>
                          </div>
                          <label className="text-xs text-muted-foreground">% Adt:</label>
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            step="0.5"
                            value={getPercentual(nome)}
                            onChange={(e) => setPerc(nome, Number(e.target.value || 0))}
                            className="h-8 w-20"
                          />
                        </div>
                      </div>
                      <div className="border rounded-md overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-8" />
                              <TableHead>OC / CT-e</TableHead>
                              <TableHead>Destino</TableHead>
                              <TableHead className="text-right">Peso (kg)</TableHead>
                              <TableHead className="text-right">Vl. Tabela</TableHead>
                              <TableHead className="text-right">Vl. Fechado</TableHead>
                              <TableHead className="text-right">R$/kg</TableHead>
                              <TableHead className="text-right">Δ</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {grupos.map(([oc, rows]) => {
                              const allInG = rows.every((r) => selecionados.has(r.id));
                              const someInG = rows.some((r) => selecionados.has(r.id)) && !allInG;
                              const totalRow = rows.reduce((s, r) => s + Number(r.valor_frete || 0), 0);
                              const pesoRow = rows.reduce((s, r) => s + Number(r.peso_total || 0), 0);
                              const tabelaRow = rows.reduce(
                                (s, r) => s + (tabelaMap?.get(r.id)?.valorTabela ?? 0),
                                0,
                              );
                              const rkgRow = pesoRow > 0 ? totalRow / pesoRow : 0;
                              const deltaRow = tabelaRow > 0 ? totalRow - tabelaRow : 0;
                              const deltaPctRow = tabelaRow > 0 ? (deltaRow / tabelaRow) * 100 : 0;
                              return (
                                <Fragment key={`${nome}-${oc}`}>
                                  <TableRow className="bg-muted/40 font-medium">
                                    <TableCell>
                                      <Checkbox checked={allInG} onCheckedChange={() => toggleMany(rows)} aria-checked={someInG ? "mixed" : allInG} />
                                    </TableCell>
                                    <TableCell className="font-mono text-xs">
                                      OC {oc === "__sem_oc__" ? "—" : oc} <span className="text-muted-foreground">({rows.length} CT-e)</span>
                                    </TableCell>
                                    <TableCell />
                                    <TableCell className="text-right text-xs tabular-nums">{fmtKg(pesoRow)}</TableCell>
                                    <TableCell className="text-right text-xs tabular-nums text-muted-foreground">
                                      {tabelaRow > 0 ? fmtBRL(tabelaRow) : "—"}
                                    </TableCell>
                                    <TableCell className="text-right text-xs tabular-nums">{fmtBRL(totalRow)}</TableCell>
                                    <TableCell className="text-right text-xs tabular-nums">{rkgRow > 0 ? fmtRkg(rkgRow) : "—"}</TableCell>
                                    <TableCell
                                      className={`text-right text-xs tabular-nums ${
                                        tabelaRow === 0
                                          ? "text-muted-foreground"
                                          : deltaRow > 0
                                            ? "text-destructive"
                                            : "text-emerald-600"
                                      }`}
                                    >
                                      {tabelaRow > 0 ? `${fmtBRL(deltaRow)} (${fmtPct(deltaPctRow)})` : "—"}
                                    </TableCell>
                                  </TableRow>
                                  {rows.map((r) => (
                                    <TableRow key={r.id}>
                                      <TableCell>
                                        <Checkbox checked={selecionados.has(r.id)} onCheckedChange={() => toggle(r.id)} />
                                      </TableCell>
                                      <TableCell className="font-mono text-xs pl-8">{r.numero_cte}{r.serie ? `/${r.serie}` : ""}</TableCell>
                                      <TableCell className="text-xs">{r.destino_cidade ? `${r.destino_cidade}/${r.destino_uf ?? ""}` : "—"}</TableCell>
                                      <TableCell className="text-right text-xs tabular-nums">{fmtKg(Number(r.peso_total ?? 0))}</TableCell>
                                      {(() => {
                                        const info = tabelaMap?.get(r.id);
                                        const vTab = info?.valorTabela ?? 0;
                                        const vFec = Number(r.valor_frete || 0);
                                        const peso = Number(r.peso_total ?? 0);
                                        const rkg = peso > 0 ? vFec / peso : 0;
                                        const delta = vTab > 0 ? vFec - vTab : 0;
                                        const deltaPct = vTab > 0 ? (delta / vTab) * 100 : 0;
                                        return (
                                          <>
                                            <TableCell className="text-right text-xs tabular-nums text-muted-foreground">
                                              {vTab > 0 ? fmtBRL(vTab) : "—"}
                                            </TableCell>
                                            <TableCell className="text-right text-xs tabular-nums">{fmtBRL(vFec)}</TableCell>
                                            <TableCell className="text-right text-xs tabular-nums">{rkg > 0 ? fmtRkg(rkg) : "—"}</TableCell>
                                            <TableCell
                                              className={`text-right text-xs tabular-nums ${
                                                vTab === 0
                                                  ? "text-muted-foreground"
                                                  : delta > 0
                                                    ? "text-destructive"
                                                    : "text-emerald-600"
                                              }`}
                                            >
                                              {vTab > 0 ? `${fmtBRL(delta)} (${fmtPct(deltaPct)})` : "—"}
                                            </TableCell>
                                          </>
                                        );
                                      })()}
                                    </TableRow>
                                  ))}
                                </Fragment>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </Card>
                  );
                })
              )}
            </div>

            <Card className="p-4 space-y-3 h-fit lg:sticky lg:top-4">
              <h3 className="font-semibold text-sm">Resumo</h3>
              {resumoPorTransp.length === 0 ? (
                <p className="text-xs text-muted-foreground">Selecione CT-es para gerar adiantamentos.</p>
              ) : (
                <div className="space-y-2">
                  {resumoPorTransp.map((r) => (
                    <div key={r.nome} className="border rounded-md p-2 text-xs space-y-0.5">
                      <div className="font-semibold truncate">{r.nome}</div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>{r.ctes.length} CT-e · {r.percentual.toFixed(1).replace(".", ",")}%{r.manual ? " (manual)" : ""}</span>
                        <span>{fmtBRL(r.total)}</span>
                      </div>
                      {r.totalTabela > 0 && (
                        <div className="flex justify-between text-muted-foreground">
                          <span>Tabela:</span>
                          <span>{fmtBRL(r.totalTabela)} · Δ <span className={r.total > r.totalTabela ? "text-destructive" : "text-emerald-600"}>{fmtPct(((r.total - r.totalTabela) / r.totalTabela) * 100)}</span></span>
                        </div>
                      )}
                      <div className="flex justify-between text-muted-foreground">
                        <span>R$/kg fechado:</span>
                        <span>{r.peso > 0 ? fmtRkg(r.total / r.peso) : "—"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Adt:</span>
                        <span className="font-semibold text-primary">{fmtBRL(r.adt)}</span>
                      </div>
                      <div className="flex items-center gap-1 pt-1">
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          placeholder="Valor manual R$"
                          value={adtManuais[r.nome] ?? ""}
                          onChange={(e) => {
                            const v = e.target.value;
                            setAdtManuais((p) => {
                              const n = { ...p };
                              if (v === "") delete n[r.nome];
                              else n[r.nome] = Number(v);
                              return n;
                            });
                          }}
                          className="h-7 text-xs"
                        />
                        {r.manual && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={() =>
                              setAdtManuais((p) => {
                                const n = { ...p };
                                delete n[r.nome];
                                return n;
                              })
                            }
                          >
                            ↺ %
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                  <div className="border-t pt-2 space-y-1 text-sm">
                    <div className="flex justify-between"><span>Transportadoras:</span><span className="font-medium">{resumoPorTransp.length}</span></div>
                    <div className="flex justify-between"><span>CT-es:</span><span className="font-medium">{totaisGerais.ctes}</span></div>
                    <div className="flex justify-between"><span>Peso total:</span><span className="font-medium">{fmtKg(totaisGerais.peso)} kg</span></div>
                    {totaisGerais.totalTabela > 0 && (
                      <div className="flex justify-between text-muted-foreground">
                        <span>Total tabela:</span>
                        <span className="font-medium">{fmtBRL(totaisGerais.totalTabela)}</span>
                      </div>
                    )}
                    <div className="flex justify-between"><span>Total fechado:</span><span className="font-medium">{fmtBRL(totaisGerais.total)}</span></div>
                    {totaisGerais.totalTabela > 0 && (
                      <div className="flex justify-between">
                        <span>Diferença:</span>
                        <span className={`font-medium ${totaisGerais.total > totaisGerais.totalTabela ? "text-destructive" : "text-emerald-600"}`}>
                          {fmtBRL(totaisGerais.total - totaisGerais.totalTabela)} ({fmtPct(((totaisGerais.total - totaisGerais.totalTabela) / totaisGerais.totalTabela) * 100)})
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Custo médio/kg:</span>
                      <span className="font-medium">{totaisGerais.peso > 0 ? fmtRkg(totaisGerais.total / totaisGerais.peso) : "—"}</span>
                    </div>
                    <div className="flex justify-between"><span>Adiantamento:</span><span className="font-bold text-primary">{fmtBRL(totaisGerais.adt)}</span></div>
                    <div className="flex justify-between"><span>Saldo:</span><span className="font-medium">{fmtBRL(totaisGerais.saldo)}</span></div>
                  </div>
                </div>
              )}
              <div>
                <label className="text-xs font-medium">Observações</label>
                <Input value={observacoes} onChange={(e) => setObservacoes(e.target.value)} placeholder="Aplica a todos" />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1">Data do adiantamento</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal")}>
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      {dataAdiantamento.toLocaleDateString("pt-BR")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dataAdiantamento}
                      onSelect={(d) => d && setDataAdiantamento(d)}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <Button className="w-full" disabled={resumoPorTransp.length === 0 || criar.isPending} onClick={handleGerar}>
                <FileText className="h-4 w-4 mr-1" /> {totalAdtsAGerar > 1 ? `Gerar ${totalAdtsAGerar} adiantamentos` : "Gerar Adiantamento"}
              </Button>
            </Card>
          </div>
        </TabsContent>

        {/* PENDENTES */}
        <TabsContent value="pendentes">
          <div className="space-y-2">
            {selPendentes.size > 0 && (
              <Card className="p-3 flex flex-wrap items-center justify-between gap-2 border-primary/40 bg-primary/5">
                <div className="text-sm">
                  <strong>{selPendentes.size}</strong> selecionado{selPendentes.size > 1 ? "s" : ""} · Total Adt:{" "}
                  <strong className="text-primary">{fmtBRL(totalAdtSelPend)}</strong>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setSelPendentes(new Set())}>
                    Limpar
                  </Button>
                  <Button size="sm" onClick={handleMarcarPagoLote}>
                    <Wallet className="h-4 w-4 mr-1" /> Marcar como pago
                  </Button>
                </div>
              </Card>
            )}
            <ListaAdiantamentos
              data={pendentes}
              selected={selPendentes}
              contexto="pendente"
              onToggle={togglePend}
              onToggleAll={() => {
                setSelPendentes((p) =>
                  p.size === pendentes.length ? new Set() : new Set(pendentes.map((a) => a.id)),
                );
              }}
              onComprovante={(a) => setComprovantesAdt(Array.isArray(a) ? a : [a])}
              onCancelar={(id) => {
                if (confirm("Cancelar este adiantamento? Os CT-es voltam a ficar disponíveis.")) cancelar.mutate(id);
              }}
            />
          </div>
        </TabsContent>

        {/* PAGOS */}
        <TabsContent value="pagos">
          <Card className="p-4 space-y-3">
            {pagosPorTransp.size === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhum adiantamento pago aguardando quitação.</p>
            ) : (
              <div className="space-y-3">
                {[...pagosPorTransp.entries()].map(([nome, lista]) => {
                  const saldoT = lista.reduce((s, a) => s + Number(a.valor_saldo || 0), 0);
                  const selDaTransp = lista.filter((a) => selPagos.has(a.id));
                  const allIn = lista.length > 0 && selDaTransp.length === lista.length;
                  const saldoSel = selDaTransp.reduce((s, a) => s + Number(a.valor_saldo || 0), 0);
                  return (
                    <div key={nome} className="border rounded-md p-3 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={allIn}
                            onCheckedChange={() => {
                              setSelPagos((p) => {
                                const n = new Set(p);
                                if (allIn) lista.forEach((a) => n.delete(a.id));
                                else lista.forEach((a) => n.add(a.id));
                                return n;
                              });
                            }}
                          />
                          <div>
                            <div className="font-semibold">{nome}</div>
                            <div className="text-xs text-muted-foreground">
                              {lista.length} lote(s) — Saldo total: <strong>{fmtBRL(saldoT)}</strong>
                              {selDaTransp.length > 0 && (
                                <> · {selDaTransp.length} selecionado(s): <strong className="text-primary">{fmtBRL(saldoSel)}</strong></>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => setComprovantesAdt(lista)}>
                            Ver comprovantes
                          </Button>
                          <Button size="sm" onClick={() => setQuitarTransp(nome)}>
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            {selDaTransp.length > 0
                              ? `Quitar ${selDaTransp.length} selecionado(s)`
                              : "Registrar Quitação"}
                          </Button>
                        </div>
                      </div>
                      <div className="border-t pt-2 space-y-1">
                        {lista.map((a) => (
                          <label
                            key={a.id}
                            className="flex items-center gap-2 text-xs hover:bg-muted/40 rounded px-1 py-0.5 cursor-pointer"
                          >
                            <Checkbox checked={selPagos.has(a.id)} onCheckedChange={() => togglePago(a.id)} />
                            <span className="font-mono">{a.numero.replace(/-OC\d+$/, "")}</span>
                            <span className="text-muted-foreground">·</span>
                            <span className="font-mono">
                              {a.tipo_agrupamento === "ordem" ? `OC ${a.ordem_carga ?? "—"}` : "Lote"}
                            </span>
                            <span className="text-muted-foreground">·</span>
                            <span>{a.qtd_ctes} CT-e</span>
                            <span className="ml-auto tabular-nums font-semibold">{fmtBRL(Number(a.valor_saldo))}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </TabsContent>

        {/* QUITADOS */}
        <TabsContent value="quitados">
          <ListaAdiantamentos data={quitados} contexto="quitado" onComprovante={(a) => setComprovantesAdt(Array.isArray(a) ? a : [a])} />
        </TabsContent>
      </Tabs>

      <ComprovanteAdiantamentoDialog
        open={comprovantesAdt.length > 0}
        onOpenChange={(o) => {
          if (!o) {
            setComprovantesAdt([]);
            setSelPendentes(new Set());
          }
        }}
        adiantamentos={comprovantesAdt}
      />
      <RegistrarQuitacaoDialog
        open={!!quitarTransp}
        onOpenChange={(o) => {
          if (!o) {
            // limpa seleção da transportadora que estava sendo quitada
            if (quitarTransp) {
              const ids = new Set((pagosPorTransp.get(quitarTransp) ?? []).map((a) => a.id));
              setSelPagos((p) => {
                const n = new Set(p);
                ids.forEach((id) => n.delete(id));
                return n;
              });
            }
            setQuitarTransp(null);
          }
        }}
        adiantamentos={
          quitarTransp
            ? (() => {
                const sel = adiantamentosParaQuitar.filter((a) => selPagos.has(a.id));
                return sel.length > 0 ? sel : adiantamentosParaQuitar;
              })()
            : []
        }
      />
    </div>
  );
}

type GrupoAdt = {
  key: string;
  items: Adiantamento[];
  rep: Adiantamento; // representativo (mais recente)
  qtdCtes: number;
  valorTotal: number;
  valorAdt: number;
  valorSaldo: number;
  pctMedio: number;
  statusUnico: Adiantamento["status"] | "misto";
  dataMin: string | null;
  dataMax: string | null;
  pagoMax: string | null;
  quitadoMax: string | null;
};

function consolidarPorOC(data: Adiantamento[]): GrupoAdt[] {
  const map = new Map<string, Adiantamento[]>();
  for (const a of data) {
    const ocKey =
      a.tipo_agrupamento === "ordem" && a.ordem_carga && a.ordem_carga.trim()
        ? `OC|${a.transportadora}|${a.ordem_carga.trim()}`
        : `SOLO|${a.id}`;
    if (!map.has(ocKey)) map.set(ocKey, []);
    map.get(ocKey)!.push(a);
  }
  const grupos: GrupoAdt[] = [];
  for (const [key, items] of map.entries()) {
    const sorted = [...items].sort((a, b) =>
      (b.created_at ?? "").localeCompare(a.created_at ?? ""),
    );
    const rep = sorted[0];
    const valorTotal = items.reduce((s, a) => s + Number(a.valor_total_ctes || 0), 0);
    const valorAdt = items.reduce((s, a) => s + Number(a.valor_adiantamento || 0), 0);
    const valorSaldo = items.reduce((s, a) => s + Number(a.valor_saldo || 0), 0);
    const qtdCtes = items.reduce((s, a) => s + Number(a.qtd_ctes || 0), 0);
    const pctMedio = valorTotal > 0 ? (valorAdt / valorTotal) * 100 : 0;
    const statuses = new Set(items.map((a) => a.status));
    const statusUnico = statuses.size === 1 ? items[0].status : "misto";
    const datas = items.map((a) => a.created_at).filter(Boolean) as string[];
    const pagos = items.map((a) => a.pago_em).filter(Boolean) as string[];
    const quitados = items.map((a) => a.quitado_em).filter(Boolean) as string[];
    grupos.push({
      key,
      items,
      rep,
      qtdCtes,
      valorTotal,
      valorAdt,
      valorSaldo,
      pctMedio,
      statusUnico,
      dataMin: datas.length ? datas.slice().sort()[0] : null,
      dataMax: datas.length ? datas.slice().sort().at(-1)! : null,
      pagoMax: pagos.length ? pagos.slice().sort().at(-1)! : null,
      quitadoMax: quitados.length ? quitados.slice().sort().at(-1)! : null,
    });
  }
  return grupos.sort((a, b) =>
    (b.dataMax ?? "").localeCompare(a.dataMax ?? ""),
  );
}

function ListaAdiantamentos({
  data,
  selected,
  onToggle,
  onToggleAll,
  onComprovante,
  onCancelar,
  contexto,
}: {
  data: Adiantamento[];
  selected?: Set<string>;
  onToggle?: (id: string) => void;
  onToggleAll?: () => void;
  onComprovante: (a: Adiantamento | Adiantamento[]) => void;
  onCancelar?: (id: string) => void;
  contexto?: "pendente" | "aguardando" | "quitado";
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const grupos = useMemo(() => consolidarPorOC(data), [data]);

  if (data.length === 0)
    return (
      <Card className="p-8 text-center text-sm text-muted-foreground">Nenhum adiantamento.</Card>
    );
  const allIn = !!selected && data.length > 0 && data.every((a) => selected.has(a.id));
  const showPagoEm = contexto === undefined || contexto !== "pendente";
  const showQuitadoEm = contexto === undefined || contexto === "quitado";

  const toggleExpand = (k: string) =>
    setExpanded((p) => {
      const n = new Set(p);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });

  const toggleGrupo = (g: GrupoAdt) => {
    if (!selected || !onToggle) return;
    const allSel = g.items.every((a) => selected.has(a.id));
    g.items.forEach((a) => {
      const has = selected.has(a.id);
      if (allSel && has) onToggle(a.id);
      else if (!allSel && !has) onToggle(a.id);
    });
  };

  return (
    <Card className="p-0 overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            {selected && (
              <TableHead className="w-8">
                <Checkbox checked={allIn} onCheckedChange={() => onToggleAll?.()} />
              </TableHead>
            )}
            <TableHead className="w-8" />
            <TableHead>Número</TableHead>
            <TableHead>Data</TableHead>
            <TableHead>Transportadora</TableHead>
            <TableHead>OC / Lote</TableHead>
            <TableHead className="text-right">CT-es</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead className="text-right">%</TableHead>
            <TableHead className="text-right">Adiantamento</TableHead>
            <TableHead className="text-right">Saldo</TableHead>
            {showPagoEm && <TableHead>Pago em</TableHead>}
            {showQuitadoEm && <TableHead>Quitado em</TableHead>}
            <TableHead>Status</TableHead>
            <TableHead className="w-32" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {grupos.map((g) => {
            const consolidado = g.items.length > 1;
            const isExp = expanded.has(g.key);
            const grupoAllSel = !!selected && g.items.every((a) => selected.has(a.id));
            const grupoSomeSel = !!selected && g.items.some((a) => selected.has(a.id));
            const dataLabel = (() => {
              if (!consolidado) return null;
              if (!g.dataMin || !g.dataMax) return null;
              const min = fmtDate(g.dataMin);
              const max = fmtDate(g.dataMax);
              return min === max ? min : `${min} – ${max}`;
            })();
            return (
              <Fragment key={g.key}>
                <TableRow className={consolidado ? "bg-muted/30" : undefined}>
                  {selected && (
                    <TableCell>
                      <Checkbox
                        checked={grupoAllSel}
                        onCheckedChange={() => toggleGrupo(g)}
                        data-state={!grupoAllSel && grupoSomeSel ? "indeterminate" : undefined}
                      />
                    </TableCell>
                  )}
                  <TableCell className="w-8">
                    {consolidado ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => toggleExpand(g.key)}
                        title={isExp ? "Recolher" : "Expandir adiantamentos"}
                      >
                        {isExp ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </Button>
                    ) : null}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {consolidado ? (
                      <span title={g.items.map((a) => a.numero).join(", ")} className="font-semibold">
                        {g.items.length} adiantamentos
                      </span>
                    ) : (
                      g.rep.numero
                    )}
                  </TableCell>
                  <TableCell className="text-xs">
                    {consolidado ? (
                      <span className="text-muted-foreground">{dataLabel}</span>
                    ) : (
                      <DataCell adiantamento={g.rep} />
                    )}
                  </TableCell>
                  <TableCell className="text-xs">{g.rep.transportadora}</TableCell>
                  <TableCell className="text-xs font-mono">
                    {g.rep.tipo_agrupamento === "ordem" ? g.rep.ordem_carga ?? "—" : "Lote"}
                  </TableCell>
                  <TableCell className="text-right text-xs">{g.qtdCtes}</TableCell>
                  <TableCell className="text-right text-xs tabular-nums">{fmtBRL(g.valorTotal)}</TableCell>
                  <TableCell className="text-right text-xs">
                    {g.pctMedio.toFixed(g.pctMedio % 1 === 0 ? 0 : 1).replace(".", ",")}%
                  </TableCell>
                  <TableCell className="text-right text-xs tabular-nums font-semibold text-primary">
                    {fmtBRL(g.valorAdt)}
                  </TableCell>
                  <TableCell className="text-right text-xs tabular-nums">{fmtBRL(g.valorSaldo)}</TableCell>
                  {showPagoEm && <TableCell className="text-xs">{fmtDate(g.pagoMax)}</TableCell>}
                  {showQuitadoEm && <TableCell className="text-xs">{fmtDate(g.quitadoMax)}</TableCell>}
                  <TableCell>
                    {g.statusUnico === "misto" ? (
                      <Badge variant="outline">Misto</Badge>
                    ) : (
                      <StatusBadge s={g.statusUnico} />
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => onComprovante(consolidado ? g.items : g.rep)}
                      title={consolidado ? "Ver comprovante consolidado" : "Ver comprovante"}
                    >
                      <FileText className="h-4 w-4" />
                    </Button>
                    {!consolidado && onCancelar && g.rep.status === "pendente" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => onCancelar(g.rep.id)}
                        title="Cancelar"
                      >
                        <XCircle className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
                {consolidado && isExp &&
                  g.items.map((a) => (
                    <TableRow key={a.id} className="bg-background/40">
                      {selected && (
                        <TableCell>
                          <Checkbox checked={selected.has(a.id)} onCheckedChange={() => onToggle?.(a.id)} />
                        </TableCell>
                      )}
                      <TableCell />
                      <TableCell className="font-mono text-xs pl-6 text-muted-foreground">↳ {a.numero}</TableCell>
                      <TableCell className="text-xs">
                        <DataCell adiantamento={a} />
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{a.transportadora}</TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">
                        {a.tipo_agrupamento === "ordem" ? a.ordem_carga ?? "—" : "Lote"}
                      </TableCell>
                      <TableCell className="text-right text-xs">{a.qtd_ctes}</TableCell>
                      <TableCell className="text-right text-xs tabular-nums">{fmtBRL(Number(a.valor_total_ctes))}</TableCell>
                      <TableCell className="text-right text-xs">{a.percentual}%</TableCell>
                      <TableCell className="text-right text-xs tabular-nums text-primary">
                        {fmtBRL(Number(a.valor_adiantamento))}
                      </TableCell>
                      <TableCell className="text-right text-xs tabular-nums">{fmtBRL(Number(a.valor_saldo))}</TableCell>
                      {showPagoEm && <TableCell className="text-xs">{fmtDate(a.pago_em)}</TableCell>}
                      {showQuitadoEm && <TableCell className="text-xs">{fmtDate(a.quitado_em)}</TableCell>}
                      <TableCell><StatusBadge s={a.status} /></TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onComprovante(a)} title="Ver comprovante">
                          <FileText className="h-4 w-4" />
                        </Button>
                        {onCancelar && a.status === "pendente" && (
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onCancelar(a.id)} title="Cancelar">
                            <XCircle className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
              </Fragment>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );
}