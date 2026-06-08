import { Fragment, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Search, Upload, Trash2, Loader2, FileText, ChevronDown, ChevronRight, Layers, List, Pencil } from "lucide-react";
import {
  useCtesDacte,
  useDeleteCteDacte,
  useDeleteCtesByIds,
  useSetPesoCargaManualByOrdem,
  type CteDacteRow,
} from "@/hooks/useCtesDacte";
import { useCtesEmAdiantamento } from "@/hooks/useAdiantamentos";
import { usePesoEfetivoPorOrdem, ordemKeyOf, type FontePeso } from "@/hooks/usePesoEfetivoPorOrdem";
import { ImportarDacteDialog } from "./ImportarDacteDialog";
import { supabase } from "@/integrations/supabase/client";
import { PhotoViewerDialog } from "@/components/portaria/PhotoViewerDialog";
import { toast } from "sonner";

const fmtBRL = (n: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n || 0);
const fmtKg = (n: number) => new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(n || 0);
const fmtDate = (s: string) => new Date(s).toLocaleDateString("pt-BR");

export function CtesDacteTab() {
  const { data = [], isLoading } = useCtesDacte();
  const { data: ctesAtivos } = useCtesEmAdiantamento();
  const del = useDeleteCteDacte();
  const delMany = useDeleteCtesByIds();
  const setPesoManual = useSetPesoCargaManualByOrdem();
  const pesoPorOrdem = usePesoEfetivoPorOrdem(data);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("todos");
  const [viewMode, setViewMode] = useState<"ordem" | "lista">("ordem");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());

  const toggleSel = (id: string) =>
    setSelecionados((p) => {
      const n = new Set(p);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  const toggleSelMany = (ids: string[]) =>
    setSelecionados((p) => {
      const n = new Set(p);
      const allIn = ids.every((id) => n.has(id));
      if (allIn) ids.forEach((id) => n.delete(id));
      else ids.forEach((id) => n.add(id));
      return n;
    });

  const apagarSelecionados = () => {
    const ids = [...selecionados];
    if (ids.length === 0) return;
    const bloqueados = ids.filter((id) => ctesAtivos?.has(id));
    if (bloqueados.length > 0) {
      toast.error(
        `${bloqueados.length} CT-e(s) estão vinculados a adiantamentos. Apague o adiantamento primeiro.`,
      );
      return;
    }
    if (!confirm(`Apagar ${ids.length} CT-e(s) selecionado(s)? Esta ação não pode ser desfeita.`)) return;
    delMany.mutate(ids, { onSuccess: () => setSelecionados(new Set()) });
  };

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return data.filter((r) => {
      if (filterStatus !== "todos" && r.status !== filterStatus) return false;
      if (!term) return true;
      return [r.numero_cte, r.transportadora, r.placa, r.destino_cidade, r.carga_id, (r as any).ordem_carga]
        .some((v) => (v ?? "").toString().toLowerCase().includes(term));
    });
  }, [data, q, filterStatus]);

  type Grupo = {
    key: string;
    ordem: string | null;
    ctes: CteDacteRow[];
    peso: number;
    frete: number;
    transportadoras: string[];
    placas: string[];
    destinos: string[];
    status: "vinculado" | "pendente" | "divergente";
    dataMaisRecente: string;
  };

  const grupos: Grupo[] = useMemo(() => {
    const map = new Map<string, Grupo>();
    for (const c of filtered) {
      const oc = (c.ordem_carga ?? "").trim();
      const key = oc || "__sem_oc__";
      let g = map.get(key);
      if (!g) {
        g = {
          key,
          ordem: oc || null,
          ctes: [],
          peso: 0,
          frete: 0,
          transportadoras: [],
          placas: [],
          destinos: [],
          status: "vinculado",
          dataMaisRecente: c.data_emissao ?? c.created_at,
        };
        map.set(key, g);
      }
      g.ctes.push(c);
      // peso é recalculado abaixo via pesoPorOrdem
      g.frete += Number(c.valor_frete ?? 0);
      if (c.transportadora && !g.transportadoras.includes(c.transportadora)) g.transportadoras.push(c.transportadora);
      if (c.placa && !g.placas.includes(c.placa)) g.placas.push(c.placa);
      const dest = c.destino_cidade ? `${c.destino_cidade}/${c.destino_uf ?? ""}` : null;
      if (dest && !g.destinos.includes(dest)) g.destinos.push(dest);
      const d = c.data_emissao ?? c.created_at;
      if (d > g.dataMaisRecente) g.dataMaisRecente = d;
    }
    // Status agregado
    for (const g of map.values()) {
      if (g.ctes.some((c) => c.status === "divergente")) g.status = "divergente";
      else if (g.ctes.every((c) => c.status === "vinculado")) g.status = "vinculado";
      else g.status = "pendente";
    }
    return [...map.values()].sort((a, b) => (b.dataMaisRecente > a.dataMaisRecente ? 1 : -1));
  }, [filtered]);

  // Anexa peso efetivo (manual / carga / cte) a cada grupo
  const gruposComPeso = useMemo(
    () =>
      grupos.map((g) => {
        const k = g.ctes[0] ? ordemKeyOf(g.ctes[0]) : null;
        const info = k ? pesoPorOrdem.get(k) : null;
        return {
          ...g,
          pesoEfetivo: info?.pesoEfetivo ?? g.ctes.reduce((s, c) => s + Number(c.peso_total ?? 0), 0),
          fonte: (info?.fonte ?? "cte") as FontePeso,
        };
      }),
    [grupos, pesoPorOrdem],
  );

  const toggle = (k: string) =>
    setExpanded((p) => {
      const n = new Set(p);
      n.has(k) ? n.delete(k) : n.add(k);
      return n;
    });

  const openPdf = async (path: string | null) => {
    if (!path) {
      toast.error("PDF não disponível para este CT-e");
      return;
    }
    const { data, error } = await supabase.storage.from("dacte").createSignedUrl(path, 3600);
    if (error || !data?.signedUrl) {
      console.error("[openPdf] createSignedUrl falhou", error);
      toast.error("Não foi possível abrir o PDF", { description: error?.message });
      return;
    }
    setViewerUrl(data.signedUrl);
    setViewerOpen(true);
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
        <div className="flex gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar..." value={q} onChange={(e) => setQ(e.target.value)} className="pl-9 w-64" />
          </div>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
            <option value="todos">Todos status</option>
            <option value="vinculado">Vinculados</option>
            <option value="pendente">Pendentes</option>
            <option value="divergente">Divergentes</option>
          </select>
          <div className="flex rounded-md border overflow-hidden h-10">
            <button
              type="button"
              onClick={() => setViewMode("ordem")}
              className={`px-3 text-sm flex items-center gap-1 ${viewMode === "ordem" ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"}`}
            >
              <Layers className="h-4 w-4" /> Por Ordem
            </button>
            <button
              type="button"
              onClick={() => setViewMode("lista")}
              className={`px-3 text-sm flex items-center gap-1 border-l ${viewMode === "lista" ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"}`}
            >
              <List className="h-4 w-4" /> Lista
            </button>
          </div>
        </div>
        <div className="flex gap-2">
          {selecionados.size > 0 && (
            <Button variant="destructive" onClick={apagarSelecionados} disabled={delMany.isPending}>
              <Trash2 className="h-4 w-4 mr-1" /> Apagar selecionados ({selecionados.size})
            </Button>
          )}
          <Button onClick={() => setOpen(true)}><Upload className="h-4 w-4 mr-1" /> Importar DACTE (PDF)</Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : viewMode === "ordem" ? (
        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8"></TableHead>
                <TableHead className="w-8"></TableHead>
                <TableHead>Ordem de Carga</TableHead>
                <TableHead>Transportadora</TableHead>
                <TableHead>Placa</TableHead>
                <TableHead>Destinos</TableHead>
                <TableHead className="text-right">CT-es</TableHead>
                <TableHead className="text-right">Peso (kg)</TableHead>
                <TableHead className="text-right">Frete</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-16" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {grupos.length === 0 && (
                <TableRow><TableCell colSpan={11} className="text-center text-sm text-muted-foreground py-6">Nenhum CT-e</TableCell></TableRow>
              )}
              {gruposComPeso.map((g) => {
                const isOpen = expanded.has(g.key);
                const gIds = g.ctes.map((c) => c.id);
                const allSel = gIds.length > 0 && gIds.every((id) => selecionados.has(id));
                const someSel = gIds.some((id) => selecionados.has(id)) && !allSel;
                return (
                  <Fragment key={g.key}>
                    <TableRow className="cursor-pointer hover:bg-muted/40" onClick={() => toggle(g.key)}>
                      <TableCell>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={(e) => { e.stopPropagation(); toggle(g.key); }}>
                          {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </Button>
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={allSel}
                          data-state={someSel ? "indeterminate" : undefined}
                          onCheckedChange={() => toggleSelMany(gIds)}
                        />
                      </TableCell>
                      <TableCell className="font-mono text-xs font-semibold">{g.ordem ?? <span className="text-muted-foreground italic">sem ordem</span>}</TableCell>
                      <TableCell className="text-xs">{g.transportadoras.length === 0 ? "—" : g.transportadoras.length === 1 ? g.transportadoras[0] : `${g.transportadoras.length} transportadoras`}</TableCell>
                      <TableCell className="text-xs">{g.placas.length === 0 ? "—" : g.placas.length === 1 ? g.placas[0] : `${g.placas.length} placas`}</TableCell>
                      <TableCell className="text-xs">
                        {g.destinos.length === 0 ? "—" : g.destinos.length <= 2 ? g.destinos.join(", ") : `${g.destinos.slice(0, 2).join(", ")} +${g.destinos.length - 2}`}
                      </TableCell>
                      <TableCell className="text-right text-xs tabular-nums">{g.ctes.length}</TableCell>
                      <TableCell className="text-right text-xs tabular-nums" onClick={(e) => e.stopPropagation()}>
                        <PesoOrdemCell
                          ordem={g.ordem}
                          pesoEfetivo={g.pesoEfetivo}
                          fonte={g.fonte}
                          onSave={(p) => g.ordem && setPesoManual.mutate({ ordem_carga: g.ordem, peso: p })}
                          isPending={setPesoManual.isPending}
                        />
                      </TableCell>
                      <TableCell className="text-right text-xs tabular-nums font-semibold">{fmtBRL(g.frete)}</TableCell>
                      <TableCell>
                        <Badge variant={g.status === "vinculado" ? "default" : g.status === "divergente" ? "destructive" : "outline"}>
                          {g.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost" size="icon" className="h-7 w-7"
                          title="Remover todos os CT-es desta ordem"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Remover ${g.ctes.length} CT-e(s) da ordem ${g.ordem ?? "(sem ordem)"}?`)) {
                              delMany.mutate(g.ctes.map((c) => c.id));
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                    {isOpen && (
                      <TableRow className="bg-muted/20 hover:bg-muted/20">
                        <TableCell></TableCell>
                        <TableCell colSpan={10} className="p-0">
                          <div className="p-2">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="w-8" />
                                  <TableHead>CT-e</TableHead>
                                  <TableHead>Data</TableHead>
                                  <TableHead>Destino</TableHead>
                                  <TableHead className="text-right">Peso (kg)</TableHead>
                                  <TableHead className="text-right">Frete</TableHead>
                                  <TableHead>Carga</TableHead>
                                  <TableHead>Status</TableHead>
                                  <TableHead className="w-20" />
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {g.ctes.map((r) => (
                                  <TableRow key={r.id}>
                                    <TableCell>
                                      <Checkbox
                                        checked={selecionados.has(r.id)}
                                        onCheckedChange={() => toggleSel(r.id)}
                                      />
                                    </TableCell>
                                    <TableCell className="font-mono text-xs">{r.numero_cte}{r.serie ? `/${r.serie}` : ""}</TableCell>
                                    <TableCell className="text-xs">{r.data_emissao ? fmtDate(r.data_emissao) : fmtDate(r.created_at)}</TableCell>
                                    <TableCell className="text-xs">{r.destino_cidade ? `${r.destino_cidade}/${r.destino_uf ?? ""}` : "—"}</TableCell>
                                    <TableCell className="text-right text-xs tabular-nums">{(r.peso_total ?? 0).toLocaleString("pt-BR")}</TableCell>
                                    <TableCell className="text-right text-xs tabular-nums">{fmtBRL(Number(r.valor_frete))}</TableCell>
                                    <TableCell className="text-xs">{r.carga_id ?? "—"}</TableCell>
                                    <TableCell>
                                      <Badge variant={r.status === "vinculado" ? "default" : r.status === "divergente" ? "destructive" : "outline"}>
                                        {r.status}
                                      </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                      {r.pdf_url && (
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openPdf(r.pdf_url)} title="Ver PDF">
                                          <FileText className="h-4 w-4" />
                                        </Button>
                                      )}
                                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { if (confirm("Remover CT-e?")) del.mutate(r.id); }}>
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8">
                  <Checkbox
                    checked={filtered.length > 0 && filtered.every((r) => selecionados.has(r.id))}
                    onCheckedChange={() => toggleSelMany(filtered.map((r) => r.id))}
                  />
                </TableHead>
                <TableHead>CT-e</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Transportadora</TableHead>
                <TableHead>Placa</TableHead>
                <TableHead>Destino</TableHead>
                <TableHead>Peso (kg)</TableHead>
                <TableHead>Frete</TableHead>
                <TableHead>Carga</TableHead>
                <TableHead>Ordem</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={12} className="text-center text-sm text-muted-foreground py-6">Nenhum CT-e</TableCell></TableRow>
              )}
              {filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <Checkbox checked={selecionados.has(r.id)} onCheckedChange={() => toggleSel(r.id)} />
                  </TableCell>
                  <TableCell className="font-mono text-xs">{r.numero_cte}{r.serie ? `/${r.serie}` : ""}</TableCell>
                  <TableCell className="text-xs">{r.data_emissao ? fmtDate(r.data_emissao) : fmtDate(r.created_at)}</TableCell>
                  <TableCell className="text-xs">{r.transportadora ?? "—"}</TableCell>
                  <TableCell className="text-xs">{r.placa ?? "—"}</TableCell>
                  <TableCell className="text-xs">{r.destino_cidade ? `${r.destino_cidade}/${r.destino_uf ?? ""}` : "—"}</TableCell>
                  <TableCell className="text-xs tabular-nums">{(r.peso_total ?? 0).toLocaleString("pt-BR")}</TableCell>
                  <TableCell className="text-xs tabular-nums">{fmtBRL(Number(r.valor_frete))}</TableCell>
                  <TableCell className="text-xs">{r.carga_id ?? "—"}</TableCell>
                  <TableCell className="text-xs font-mono">{(r as any).ordem_carga ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={r.status === "vinculado" ? "default" : r.status === "divergente" ? "destructive" : "outline"}>
                      {r.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {r.pdf_url && (
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openPdf(r.pdf_url)} title="Ver PDF">
                        <FileText className="h-4 w-4" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { if (confirm("Remover CT-e?")) del.mutate(r.id); }}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <ImportarDacteDialog open={open} onOpenChange={setOpen} />
      <PhotoViewerDialog open={viewerOpen} onOpenChange={setViewerOpen} url={viewerUrl} alt="DACTE" />
    </Card>
  );
}

function PesoOrdemCell({
  ordem,
  pesoEfetivo,
  fonte,
  onSave,
  isPending,
}: {
  ordem: string | null;
  pesoEfetivo: number;
  fonte: FontePeso;
  onSave: (peso: number | null) => void;
  isPending: boolean;
}) {
  const [popOpen, setPopOpen] = useState(false);
  const [valor, setValor] = useState<string>(
    pesoEfetivo > 0 ? String(Math.round(pesoEfetivo)) : "",
  );

  const fonteLabel: Record<FontePeso, { label: string; cls: string; tip: string }> = {
    manual: { label: "manual", cls: "bg-blue-500/15 text-blue-600 border-blue-500/30", tip: "Peso digitado manualmente" },
    carga: { label: "carga", cls: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30", tip: "Peso somado dos pedidos da carga (carregamentos do dia)" },
    cte: { label: "CT-e", cls: "bg-muted text-muted-foreground", tip: "Peso somado dos próprios CT-es (pode estar zerado por barreira)" },
  };
  const f = fonteLabel[fonte];

  return (
    <div className="flex items-center justify-end gap-1.5">
      <span>{fmtKg(pesoEfetivo)}</span>
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className={`inline-flex items-center rounded px-1.5 py-0 text-[10px] border ${f.cls}`}>{f.label}</span>
          </TooltipTrigger>
          <TooltipContent>{f.tip}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      {ordem && (
        <Popover open={popOpen} onOpenChange={(o) => { setPopOpen(o); if (o) setValor(pesoEfetivo > 0 ? String(Math.round(pesoEfetivo)) : ""); }}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6" title="Editar peso da carga">
              <Pencil className="h-3 w-3" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 space-y-2" align="end">
            <div className="text-xs font-semibold">Peso da carga (kg)</div>
            <p className="text-[11px] text-muted-foreground">
              Override manual para toda a ordem <span className="font-mono">{ordem}</span>.
              Use quando o CT-e foi emitido com peso zero (barreira fiscal).
            </p>
            <Input
              type="number"
              min={0}
              step="1"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              placeholder="Ex.: 26500"
              autoFocus
            />
            <div className="flex justify-between gap-2">
              <Button
                variant="ghost"
                size="sm"
                disabled={isPending}
                onClick={() => { onSave(null); setPopOpen(false); }}
              >
                Limpar
              </Button>
              <Button
                size="sm"
                disabled={isPending || !valor || Number(valor) <= 0}
                onClick={() => { onSave(Number(valor)); setPopOpen(false); }}
              >
                Salvar
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}