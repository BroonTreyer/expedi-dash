import { useCallback, useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Upload, FileText, Loader2, AlertTriangle, CheckCircle2, X, Search, Link2, Wand2, Eraser } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { autoVincularCarga, useInsertCteDacte, buscarCargasPorOrdem, type CargaPorOrdemRow } from "@/hooks/useCtesDacte";

function OrdemCargaPicker({ value, onChange, cargaIdAtual }: { value: string; onChange: (v: string, picked?: CargaPorOrdemRow | null) => void; cargaIdAtual: string | null }) {
  const [results, setResults] = useState<CargaPorOrdemRow[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = value.trim();
    if (!q) { setResults([]); return; }
    setLoading(true);
    const t = setTimeout(async () => {
      const r = await buscarCargasPorOrdem(q);
      setResults(r);
      setLoading(false);
    }, 300);
    return () => clearTimeout(t);
  }, [value]);

  return (
    <div className="space-y-1 relative">
      <Label className="text-xs flex items-center gap-1.5">
        <Link2 className="h-3.5 w-3.5" /> Ordem de Carga
        {cargaIdAtual && <Badge className="bg-emerald-600 text-white text-[10px] h-5">Vinculado: {cargaIdAtual}</Badge>}
      </Label>
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          value={value}
          onChange={(e) => { onChange(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Digite a Ordem de Carga (ex: OC-1234)"
          className="h-8 text-sm pl-8"
        />
      </div>
      {open && value.trim() && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-md max-h-64 overflow-y-auto">
          {loading ? (
            <div className="p-2 text-xs text-muted-foreground flex items-center gap-2"><Loader2 className="h-3 w-3 animate-spin" /> Buscando...</div>
          ) : results.length === 0 ? (
            <div className="p-2 text-xs text-muted-foreground">Nenhuma carga encontrada com essa Ordem.</div>
          ) : (
            results.map((r) => (
              <button
                key={r.carga_id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => { onChange(r.ordem_carga, r); setOpen(false); }}
                className="w-full text-left px-2.5 py-1.5 hover:bg-muted text-xs border-b border-border last:border-b-0"
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold">{r.ordem_carga}</span>
                  <span className="text-muted-foreground">·</span>
                  <span className="truncate">{r.nome_carga || r.carga_id}</span>
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  {r.placa && <span className="font-mono">{r.placa}</span>}
                  {r.transportadora && <> · {r.transportadora}</>}
                  {r.motorista && <> · {r.motorista}</>}
                  {r.data && <> · {new Date(r.data).toLocaleDateString("pt-BR")}</>}
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

type Parsed = {
  numero_cte: string;
  serie?: string;
  valor_frete: number;
  transportadora?: string;
  placa?: string;
  destino_cidade?: string;
  destino_uf?: string;
  peso_total?: number;
  data_emissao?: string;
  notas_fiscais: string[];
  tomador?: string;
};

type Item = {
  fileId: string;
  file: File;
  fileName: string;
  ctIndex?: number;
  ctTotal?: number;
  status: "loading" | "ok" | "error" | "saving" | "saved" | "rejected";
  error?: string;
  parsed?: Parsed;
  carga_id?: string | null;
  ordem_carga?: string;
  vinculo_status?: "pendente" | "vinculado" | "divergente";
};

function normalizeTomador(s: string): string {
  return (s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}
function isFrico(s: string | undefined | null): boolean {
  if (!s) return false;
  return normalizeTomador(s).includes("frico");
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const r = reader.result as string;
      const idx = r.indexOf(",");
      resolve(idx >= 0 ? r.slice(idx + 1) : r);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

export function ImportarDacteDialog({ open, onOpenChange }: Props) {
  const [items, setItems] = useState<Item[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const insertMut = useInsertCteDacte();
  const [modoBulk, setModoBulk] = useState<"uma" | "varias">("uma");
  const [bulkOrdem, setBulkOrdem] = useState("");
  const [bulkLista, setBulkLista] = useState("");
  const [sobrescrever, setSobrescrever] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setItems([]);
      setBulkOrdem("");
      setBulkLista("");
      setSobrescrever(false);
      setModoBulk("uma");
    }
  }, [open]);

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const arr = Array.from(files).filter((f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"));
    if (!arr.length) return toast.error("Selecione PDFs");

    const placeholders: Item[] = arr.map((f) => ({
      fileId: `${f.name}-${f.size}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      file: f,
      fileName: f.name,
      status: "loading",
    }));
    setItems((prev) => [...prev, ...placeholders]);

    await Promise.allSettled(arr.map(async (file, idx) => {
      const ph = placeholders[idx];
      try {
        const b64 = await fileToBase64(file);
        const { data, error } = await supabase.functions.invoke("parse-dacte-pdf", {
          body: { fileBase64: b64, fileName: file.name },
        });
        if (error) throw error;
        const ctes = ((data as any)?.ctes ?? []) as Parsed[];
        if (!ctes.length) throw new Error("Nenhum CT-e identificado no PDF");
        // Vincula cada CT-e em paralelo
        const enriched = await Promise.all(ctes.map(async (parsed) => {
          const vinc = await autoVincularCarga(parsed.notas_fiscais ?? []);
          return { parsed, carga_id: vinc.carga_id, vinculo_status: vinc.status };
        }));
        const newItems: Item[] = enriched.map((e, i) => {
          const tomador = (e.parsed.tomador ?? "").trim();
          const tomadorPresente = tomador.length > 0;
          const tomadorFrico = isFrico(tomador);
          const rejected = tomadorPresente && !tomadorFrico;
          return {
            fileId: `${ph.fileId}-${i}`,
            file,
            fileName: file.name,
            ctIndex: i + 1,
            ctTotal: enriched.length,
            status: rejected ? ("rejected" as const) : ("ok" as const),
            error: rejected ? `Tomador não é Frico: ${tomador}` : undefined,
            parsed: e.parsed,
            carga_id: rejected ? null : e.carga_id,
            vinculo_status: rejected ? undefined : e.vinculo_status,
          };
        });
        setItems((prev) => {
          const without = prev.filter((p) => p.fileId !== ph.fileId);
          return [...without, ...newItems];
        });
      } catch (e: any) {
        setItems((prev) => prev.map((p) => p.fileId === ph.fileId
          ? { ...p, status: "error", error: e?.message || "Falha" } : p));
      }
    }));
    if (inputRef.current) inputRef.current.value = "";
  }, []);

  const updateParsed = (fileId: string, patch: Partial<Parsed>) => {
    setItems((prev) => prev.map((p) => p.fileId === fileId && p.parsed ? { ...p, parsed: { ...p.parsed, ...patch } } : p));
  };

  const updateOrdem = async (fileId: string, ordem: string, picked?: CargaPorOrdemRow | null) => {
    setItems((prev) => prev.map((p) => p.fileId === fileId
      ? {
          ...p,
          ordem_carga: ordem,
          ...(picked
            ? { carga_id: picked.carga_id, vinculo_status: "vinculado" as const }
            : {}),
        }
      : p));
  };

  const remove = (fileId: string) => setItems((prev) => prev.filter((p) => p.fileId !== fileId));

  const parseOcs = (s: string): string[] =>
    s.split(/[\n,;\s]+/).map((x) => x.trim()).filter(Boolean);

  const aplicarMesmaOc = async () => {
    const oc = bulkOrdem.trim();
    if (!oc) return toast.error("Digite a Ordem de Carga");
    setBulkLoading(true);
    try {
      const r = await buscarCargasPorOrdem(oc);
      const picked = r.length === 1 ? r[0] : null;
      setItems((prev) => prev.map((p) => {
        if (p.status !== "ok") return p;
        if (!sobrescrever && (p.ordem_carga ?? "").trim()) return p;
        return {
          ...p,
          ordem_carga: oc,
          ...(picked ? { carga_id: picked.carga_id, vinculo_status: "vinculado" as const } : {}),
        };
      }));
      toast.success(picked ? `OC aplicada e vinculada à carga ${picked.carga_id}` : "OC aplicada a todos os itens");
    } finally {
      setBulkLoading(false);
    }
  };

  const distribuirOcs = async () => {
    const ocs = parseOcs(bulkLista);
    if (!ocs.length) return toast.error("Cole as Ordens de Carga (uma por linha ou separadas por vírgula)");
    setBulkLoading(true);
    try {
      const okItems = items.filter((i) => i.status === "ok");
      const alvos = sobrescrever ? okItems : okItems.filter((p) => !(p.ordem_carga ?? "").trim());
      const n = Math.min(alvos.length, ocs.length);
      const lookup = await Promise.all(ocs.slice(0, n).map(async (oc) => {
        const r = await buscarCargasPorOrdem(oc);
        return { oc, picked: r.length === 1 ? r[0] : null };
      }));
      const byId = new Map(alvos.slice(0, n).map((it, i) => [it.fileId, lookup[i]]));
      setItems((prev) => prev.map((p) => {
        const m = byId.get(p.fileId);
        if (!m) return p;
        return {
          ...p,
          ordem_carga: m.oc,
          ...(m.picked ? { carga_id: m.picked.carga_id, vinculo_status: "vinculado" as const } : {}),
        };
      }));
      const sobra = ocs.length - n;
      const vincs = lookup.filter((l) => l.picked).length;
      toast.success(`${n} OC(s) distribuída(s)${vincs ? `, ${vincs} vinculada(s)` : ""}${sobra > 0 ? ` · ${sobra} sobraram` : ""}`);
    } finally {
      setBulkLoading(false);
    }
  };

  const limparOcs = () => {
    setItems((prev) => prev.map((p) => p.status === "ok"
      ? { ...p, ordem_carga: "", carga_id: null, vinculo_status: "pendente" as const }
      : p));
    toast.success("OCs limpas");
  };

  const handleSaveAll = async () => {
    const ok = items.filter((i) => i.status === "ok" && i.parsed && isFrico(i.parsed.tomador));
    const recusados = items.filter((i) => i.status === "rejected").length;
    const semTomador = items.filter((i) => i.status === "ok" && !((i.parsed?.tomador ?? "").trim())).length;
    if (!ok.length) {
      if (recusados || semTomador) {
        toast.error(`Nada para salvar — ${recusados} recusado(s)${semTomador ? `, ${semTomador} sem tomador` : ""}.`);
      }
      return;
    }
    for (const it of ok) {
      try {
        setItems((p) => p.map((x) => x.fileId === it.fileId ? { ...x, status: "saving" } : x));
        // upload pdf
        const safeId = it.fileId.replace(/[^\w.\-]+/g, "_");
        const safeNum = (it.parsed!.numero_cte || "sem-numero").replace(/[^\w.\-]+/g, "_");
        const path = `${new Date().getFullYear()}/${safeNum}-${safeId}.pdf`;
        const { error: upErr } = await supabase.storage.from("dacte").upload(path, it.file, { upsert: true, contentType: "application/pdf" });
        if (upErr) throw upErr;
        await insertMut.mutateAsync({
          numero_cte: it.parsed!.numero_cte,
          serie: it.parsed!.serie || null,
          valor_frete: Number(it.parsed!.valor_frete) || 0,
          transportadora: it.parsed!.transportadora || null,
          placa: it.parsed!.placa || null,
          destino_cidade: it.parsed!.destino_cidade || null,
          destino_uf: it.parsed!.destino_uf || null,
          peso_total: it.parsed!.peso_total ?? null,
          data_emissao: it.parsed!.data_emissao || null,
          notas_fiscais: (it.parsed!.notas_fiscais ?? []) as any,
          pdf_url: path,
          raw_extracao: it.parsed as any,
          carga_id: it.carga_id ?? null,
          ordem_carga: (it.ordem_carga ?? "").trim() || null,
          status: it.vinculo_status ?? "pendente",
        });
        setItems((p) => p.map((x) => x.fileId === it.fileId ? { ...x, status: "saved" } : x));
      } catch (e: any) {
        toast.error(`${it.fileName}: ${e.message ?? "erro"}`);
        setItems((p) => p.map((x) => x.fileId === it.fileId ? { ...x, status: "error", error: e.message } : x));
      }
    }
    const skipped = recusados + semTomador;
    toast.success(`CT-es salvos${skipped ? ` · ${skipped} ignorado(s) (tomador inválido)` : ""}`);
  };

  const okCount = items.filter((i) => i.status === "ok" && isFrico(i.parsed?.tomador)).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar DACTE (PDF)</DialogTitle>
          <DialogDescription>
            Faça upload de um ou mais PDFs de DACTE/CT-e. A IA vai extrair número, valor do frete e notas fiscais. O sistema tenta vincular automaticamente à carga correspondente.
          </DialogDescription>
        </DialogHeader>

        <div className="border-2 border-dashed border-border rounded-lg p-6 text-center bg-muted/30">
          <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm font-medium mb-1">Selecione um ou mais DACTEs em PDF</p>
          <input ref={inputRef} type="file" accept="application/pdf,.pdf" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
          <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
            <FileText className="h-4 w-4 mr-1" /> Selecionar PDFs
          </Button>
        </div>

        {items.length > 0 && (
          <div className="space-y-3 mt-2">
            {okCount >= 2 && (
              <div className="border border-dashed border-border rounded-lg p-3 bg-muted/30 space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="text-xs font-semibold flex items-center gap-1.5">
                    <Wand2 className="h-3.5 w-3.5" /> Preencher OCs em lote ({okCount} itens)
                  </div>
                  <div className="inline-flex rounded-md border p-0.5 bg-background">
                    <Button type="button" variant={modoBulk === "uma" ? "default" : "ghost"} size="sm"
                      className="h-6 px-2 text-[10px]" onClick={() => setModoBulk("uma")}>Mesma OC</Button>
                    <Button type="button" variant={modoBulk === "varias" ? "default" : "ghost"} size="sm"
                      className="h-6 px-2 text-[10px]" onClick={() => setModoBulk("varias")}>Múltiplas OCs</Button>
                  </div>
                </div>

                {modoBulk === "uma" ? (
                  <div className="flex items-end gap-2 flex-wrap">
                    <div className="flex-1 min-w-[180px]">
                      <Input
                        value={bulkOrdem}
                        onChange={(e) => {
                          const v = e.target.value;
                          const detect = parseOcs(v);
                          if (detect.length > 1) {
                            setBulkLista(v);
                            setModoBulk("varias");
                            setBulkOrdem("");
                            toast.message(`Detectamos ${detect.length} OCs — mude para "Múltiplas OCs" para distribuir.`);
                          } else {
                            setBulkOrdem(v);
                          }
                        }}
                        placeholder="Ex: OC-1234"
                        className="h-8 text-sm"
                      />
                    </div>
                    <Button size="sm" className="h-8" onClick={aplicarMesmaOc} disabled={bulkLoading || !bulkOrdem.trim()}>
                      {bulkLoading ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Wand2 className="h-3.5 w-3.5 mr-1" />}
                      Aplicar a todos
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Textarea
                      value={bulkLista}
                      onChange={(e) => setBulkLista(e.target.value)}
                      placeholder={"Cole as OCs (uma por linha, vírgula ou espaço)\nEx:\nOC-1234\nOC-1235\nOC-1236"}
                      className="text-sm font-mono min-h-[72px]"
                    />
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-[10px] text-muted-foreground">
                        {parseOcs(bulkLista).length} OCs detectadas · serão atribuídas em ordem aos itens.
                      </span>
                      <Button size="sm" className="h-8" onClick={distribuirOcs} disabled={bulkLoading || !bulkLista.trim()}>
                        {bulkLoading ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Wand2 className="h-3.5 w-3.5 mr-1" />}
                        Distribuir
                      </Button>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between gap-2 flex-wrap pt-1 border-t border-border">
                  <label className="flex items-center gap-1.5 text-[11px] cursor-pointer">
                    <Checkbox checked={sobrescrever} onCheckedChange={(v) => setSobrescrever(!!v)} />
                    Sobrescrever OCs já preenchidas
                  </label>
                  <Button variant="ghost" size="sm" className="h-7 text-[11px]" onClick={limparOcs}>
                    <Eraser className="h-3.5 w-3.5 mr-1" /> Limpar todas
                  </Button>
                </div>
              </div>
            )}

            {items.map((it) => (
              <div key={it.fileId} className="border border-border rounded-lg p-3 bg-card space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap min-w-0">
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-xs font-mono text-muted-foreground truncate">{it.fileName}</span>
                    {it.ctTotal && it.ctTotal > 1 && (
                      <Badge variant="outline" className="text-[10px]">CT-e {it.ctIndex}/{it.ctTotal}</Badge>
                    )}
                    {it.status === "loading" && <Badge variant="secondary" className="gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Lendo</Badge>}
                    {it.status === "rejected" && <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" /> Recusado · Tomador: {it.parsed?.tomador || "—"}</Badge>}
                    {it.status === "saving" && <Badge variant="secondary" className="gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Salvando</Badge>}
                    {it.status === "saved" && <Badge className="bg-emerald-600 text-white gap-1"><CheckCircle2 className="h-3 w-3" /> Salvo</Badge>}
                    {it.status === "error" && <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" /> {it.error}</Badge>}
                    {it.status === "ok" && it.vinculo_status === "vinculado" && <Badge className="bg-emerald-600 text-white">Vinculado à carga {it.carga_id}</Badge>}
                    {it.status === "ok" && it.vinculo_status === "pendente" && <Badge variant="outline">Sem vínculo automático</Badge>}
                    {it.status === "ok" && it.vinculo_status === "divergente" && <Badge className="bg-amber-500 text-white">Múltiplas cargas — revisar</Badge>}
                    {it.status === "ok" && !((it.parsed?.tomador ?? "").trim()) && (
                      <Badge className="bg-amber-500 text-white gap-1"><AlertTriangle className="h-3 w-3" /> Tomador não identificado</Badge>
                    )}
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => remove(it.fileId)}><X className="h-4 w-4" /></Button>
                </div>

                {(it.status === "ok" || it.status === "rejected") && it.parsed && (
                  <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                    {it.status === "ok" && (
                      <div className="col-span-2 sm:col-span-6">
                      <OrdemCargaPicker
                        value={it.ordem_carga ?? ""}
                        onChange={(v, picked) => updateOrdem(it.fileId, v, picked)}
                        cargaIdAtual={it.carga_id ?? null}
                      />
                      </div>
                    )}
                    <div className="col-span-2 sm:col-span-6 space-y-1">
                      <Label className="text-xs flex items-center gap-1.5">
                        Tomador
                        {isFrico(it.parsed.tomador) && (
                          <Badge className="bg-emerald-600 text-white text-[10px] h-5">Frico ✓</Badge>
                        )}
                        {it.status === "rejected" && (
                          <Badge variant="destructive" className="text-[10px] h-5">Recusado</Badge>
                        )}
                      </Label>
                      <Input
                        value={it.parsed.tomador ?? ""}
                        onChange={(e) => {
                          const novo = e.target.value;
                          updateParsed(it.fileId, { tomador: novo });
                          // re-avalia status conforme edição manual
                          setItems((prev) => prev.map((p) => {
                            if (p.fileId !== it.fileId) return p;
                            const tomadorPresente = novo.trim().length > 0;
                            const ok = !tomadorPresente || isFrico(novo);
                            return {
                              ...p,
                              status: ok ? "ok" : "rejected",
                              error: ok ? undefined : `Tomador não é Frico: ${novo}`,
                            };
                          }));
                        }}
                        className="h-8 text-sm"
                        placeholder="Razão social do tomador do CT-e"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Nº CT-e</Label>
                      <Input value={it.parsed.numero_cte} onChange={(e) => updateParsed(it.fileId, { numero_cte: e.target.value })} className="h-8 text-sm" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Série</Label>
                      <Input value={it.parsed.serie ?? ""} onChange={(e) => updateParsed(it.fileId, { serie: e.target.value })} className="h-8 text-sm" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Valor Frete (R$)</Label>
                      <Input type="number" step="0.01" value={it.parsed.valor_frete} onChange={(e) => updateParsed(it.fileId, { valor_frete: Number(e.target.value) || 0 })} className="h-8 text-sm" />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs">Transportadora</Label>
                      <Input value={it.parsed.transportadora ?? ""} onChange={(e) => updateParsed(it.fileId, { transportadora: e.target.value })} className="h-8 text-sm" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Placa</Label>
                      <Input value={it.parsed.placa ?? ""} onChange={(e) => updateParsed(it.fileId, { placa: e.target.value.toUpperCase() })} className="h-8 text-sm" />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs">Destino</Label>
                      <Input value={it.parsed.destino_cidade ?? ""} onChange={(e) => updateParsed(it.fileId, { destino_cidade: e.target.value })} className="h-8 text-sm" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">UF</Label>
                      <Input value={it.parsed.destino_uf ?? ""} maxLength={2} onChange={(e) => updateParsed(it.fileId, { destino_uf: e.target.value.toUpperCase() })} className="h-8 text-sm" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Peso (kg)</Label>
                      <Input type="number" step="0.01" value={it.parsed.peso_total ?? 0} onChange={(e) => updateParsed(it.fileId, { peso_total: Number(e.target.value) || 0 })} className="h-8 text-sm" />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs">Notas Fiscais</Label>
                      <Input value={(it.parsed.notas_fiscais ?? []).join(", ")} readOnly className="h-8 text-sm bg-muted/50" />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Fechar</Button>
          <Button onClick={handleSaveAll} disabled={okCount === 0 || insertMut.isPending}>
            {insertMut.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
            Salvar {okCount > 0 ? `(${okCount})` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}