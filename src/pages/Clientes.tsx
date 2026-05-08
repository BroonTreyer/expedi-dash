import { useState, useRef, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { useClientes, useCreateCliente, useUpdateCliente, useDeleteCliente } from "@/hooks/useClientes";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SortableTableHead } from "@/components/ui/sortable-table-head";
import { useSortableTable } from "@/hooks/useSortableTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { DeleteConfirmDialog } from "@/components/dashboard/DeleteConfirmDialog";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious, PaginationEllipsis } from "@/components/ui/pagination";
import { Plus, Edit, Trash2, Search, Building2, Upload, RefreshCw, FileText } from "lucide-react";
import { ImportarClientesPdfDialog } from "@/components/clientes/ImportarClientesPdfDialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { maskCep, normalizeCep, ufFromCep } from "@/lib/cep-uf";

const PAGE_SIZE = 50;

export default function Clientes() {
  const { data: clientes = [], isLoading } = useClientes();
  const createMut = useCreateCliente();
  const updateMut = useUpdateCliente();
  const deleteMut = useDeleteCliente();
  const qc = useQueryClient();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [form, setForm] = useState({ codigo_cliente: "", nome_cliente: "", cidade: "", uf: "", cep: "", ativo: true });
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [reprocessing, setReprocessing] = useState(false);
  const { sort, toggleSort, sortData } = useSortableTable();
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setPage(1); }, [search]);

  const filteredRaw = clientes.filter((c: any) => {
    const s = search.trim().toLowerCase();
    if (!s) return true;
    const codigo = String(c.codigo_cliente || "").toLowerCase();
    const nome = String(c.nome_cliente || "").toLowerCase();
    const cidade = String(c.cidade || "").toLowerCase();
    const uf = String(c.uf || "").toLowerCase();
    return codigo.includes(s) || nome.includes(s) || cidade.includes(s) || uf.includes(s);
  });

  const filtered = sortData(filteredRaw, {
    codigo_cliente: (c: any) => c.codigo_cliente,
    nome_cliente: (c: any) => c.nome_cliente,
    cidade: (c: any) => c.cidade ?? "",
    uf: (c: any) => c.uf ?? "",
    ativo: (c: any) => c.ativo,
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const startItem = filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const endItem = Math.min(page * PAGE_SIZE, filtered.length);

  const openNew = () => { setEditing(null); setFormError(null); setForm({ codigo_cliente: "", nome_cliente: "", cidade: "", uf: "", cep: "", ativo: true }); setOpen(true); };
  const openEdit = (c: any) => { setEditing(c); setFormError(null); setForm({ codigo_cliente: c.codigo_cliente, nome_cliente: c.nome_cliente, cidade: c.cidade || "", uf: c.uf || "", cep: c.cep ? maskCep(c.cep) : "", ativo: c.ativo }); setOpen(true); };

  const handleCepBlur = () => {
    const norm = normalizeCep(form.cep);
    if (norm && !form.uf) {
      const inferred = ufFromCep(norm);
      if (inferred) setForm(f => ({ ...f, uf: inferred }));
    }
  };

  const isSubmitting = createMut.isPending || updateMut.isPending;
  const handleSubmit = () => {
    setFormError(null);
    const codigo = form.codigo_cliente.trim();
    const nome = form.nome_cliente.trim();
    if (!codigo) { setFormError("Informe o código do cliente."); return; }
    if (!nome) { setFormError("Informe o nome do cliente."); return; }
    const payload = { ...form, codigo_cliente: codigo, nome_cliente: nome, cep: normalizeCep(form.cep) || undefined };
    if (editing) {
      updateMut.mutate({ id: editing.id, ...payload }, {
        onSuccess: () => { setFormError(null); setOpen(false); },
        onError: (e: any) => setFormError(e?.message || "Falha ao salvar. Tente novamente."),
      });
    } else {
      createMut.mutate(payload, {
        onSuccess: () => { setFormError(null); setOpen(false); },
        onError: (e: any) => setFormError(e?.message || "Falha ao salvar. Tente novamente."),
      });
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" }) as any[][];
      if (rows.length < 2) { toast.error("Planilha vazia"); setImporting(false); return; }

      // Detectar índices das colunas pelo cabeçalho (case/acento-insensitive)
      const norm = (s: any) => String(s ?? "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const header = (rows[0] || []).map(norm);
      const findIdx = (...candidates: string[]) => {
        for (const c of candidates) {
          const idx = header.findIndex(h => h === c || h.includes(c));
          if (idx !== -1) return idx;
        }
        return -1;
      };
      const idxCodigo = findIdx("codigo cliente", "codigo", "cod cliente", "cod");
      const idxNome   = findIdx("nome cliente", "nome", "razao social", "cliente");
      const idxCidade = findIdx("cidade", "municipio");
      const idxUf     = findIdx("uf", "estado");
      const idxCep    = findIdx("cep");

      if (idxCodigo === -1 || idxNome === -1) {
        toast.error("Cabeçalho deve conter ao menos as colunas 'Código' e 'Nome'");
        setImporting(false);
        return;
      }

      const records = rows.slice(1)
        .filter(r => r[idxCodigo] != null && String(r[idxCodigo]).trim())
        .map(r => {
          const cep = idxCep !== -1 ? normalizeCep(r[idxCep]) : "";
          let uf = idxUf !== -1 ? String(r[idxUf] || "").trim().toUpperCase().slice(0, 2) : "";
          if (!uf && cep) uf = ufFromCep(cep);
          return {
            codigo_cliente: String(r[idxCodigo]).trim(),
            nome_cliente: String(r[idxNome] || "").trim(),
            cidade: idxCidade !== -1 ? (String(r[idxCidade] || "").trim() || null) : null,
            uf: uf || null,
            cep: cep || null,
            ativo: true,
          };
        });

      let imported = 0;
      for (let i = 0; i < records.length; i += 200) {
        const batch = records.slice(i, i + 200);
        const { error } = await supabase.from("clientes").upsert(batch, { onConflict: "codigo_cliente" } as any);
        if (error) { toast.error(`Erro no lote ${i}: ${error.message}`); setImporting(false); return; }
        imported += batch.length;
      }
      // Enriquecer cidade/UF via ViaCEP em chunks (evita timeout/CPU)
      let enrichMsg = "";
      let enrTotal = 0;
      try {
        let cursor: string | null = null;
        for (let pass = 0; pass < 200; pass++) {
          const { data: enrichData }: any = await supabase.functions.invoke("enrich-clientes-viacep", { body: { cursor } });
          enrTotal += (enrichData?.updated ?? 0);
          if (enrichData?.done || !enrichData?.next_cursor) break;
          cursor = enrichData.next_cursor;
        }
        if (enrTotal > 0) enrichMsg = ` ${enrTotal} clientes atualizados via ViaCEP.`;
      } catch {}
      // Propagar nome/cidade/UF para os pedidos existentes
      let syncMsg = "";
      try {
        const { data: syncData } = await supabase.rpc("sync_clients_to_orders");
        const updated = (syncData as any)?.updated ?? 0;
        if (updated > 0) syncMsg = ` ${updated} pedidos sincronizados.`;
      } catch {}
      toast.success(`${imported} clientes importados com sucesso!${enrichMsg}${syncMsg}`);
      qc.invalidateQueries({ queryKey: ["clientes"] });
      qc.invalidateQueries({ queryKey: ["carregamentos"] });
    } catch (err: any) {
      toast.error("Erro ao importar: " + err.message);
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.rpc("sync_clients_to_orders");
      if (error) throw error;
      const updated = (data as any)?.updated ?? 0;
      toast.success(updated > 0 ? `${updated} pedidos sincronizados com o cadastro.` : "Pedidos já estavam sincronizados.");
      qc.invalidateQueries({ queryKey: ["carregamentos"] });
    } catch (err: any) {
      toast.error("Erro ao sincronizar: " + err.message);
    } finally {
      setSyncing(false);
    }
  };

  const handleEnrichViaCep = async () => {
    setEnriching(true);
    const tId = toast.loading("Atualizando clientes via ViaCEP (3 lotes paralelos)...");
    try {
      const ranges = [
        { cep_min: "00000000", cep_max: "30000000" },
        { cep_min: "30000000", cep_max: "60000000" },
        { cep_min: "60000000", cep_max: "99999999" },
      ];

      const totals = { updated: 0, resolved: 0, processed: 0, cacheHits: 0, batchesDone: 0 };
      const updateToast = () => {
        toast.loading(
          `ViaCEP: ${totals.batchesDone}/3 lotes • ${totals.processed} processados • ${totals.updated} atualizados (${totals.cacheHits} via cache)`,
          { id: tId }
        );
      };

      const runRange = async (range: { cep_min: string; cep_max: string }) => {
        let cursor: string | null = null;
        let firstPass = true;
        for (let pass = 0; pass < 200; pass++) {
          const body: any = firstPass
            ? { cep_min: range.cep_min, cep_max: range.cep_max }
            : { cursor, cep_max: range.cep_max };
          firstPass = false;
          const { data, error }: any = await supabase.functions.invoke("enrich-clientes-viacep", { body });
          if (error) throw error;
          totals.updated += data?.updated ?? 0;
          totals.resolved += data?.viacep_resolved ?? 0;
          totals.processed += data?.processed ?? 0;
          totals.cacheHits += data?.cache_hits ?? 0;
          updateToast();
          if (data?.done || !data?.next_cursor) break;
          cursor = data.next_cursor;
        }
        totals.batchesDone += 1;
        updateToast();
      };

      await Promise.all(ranges.map(runRange));

      const { data: syncData } = await supabase.rpc("sync_clients_to_orders");
      const ordUpdated = (syncData as any)?.updated ?? 0;

      toast.success(
        `ViaCEP concluído: ${totals.updated} clientes atualizados (${totals.resolved} resolvidos, ${totals.cacheHits} via cache). ${ordUpdated} pedidos sincronizados.`,
        { id: tId }
      );
      qc.invalidateQueries({ queryKey: ["clientes"] });
      qc.invalidateQueries({ queryKey: ["carregamentos"] });
    } catch (err: any) {
      toast.error("Erro ao atualizar via CEP: " + (err.message || err), { id: tId });
    } finally {
      setEnriching(false);
    }
  };

  const handleReprocessPending = async () => {
    setReprocessing(true);
    const tId = toast.loading("Reprocessando clientes pendentes...");
    try {
      let totalUpdated = 0;
      let totalResolved = 0;
      let totalFailed = 0;
      let totalProcessed = 0;
      let pass = 0;
      // Loop até zerar pendentes (sem cursor — função sempre busca os primeiros com cidade null)
      for (pass = 0; pass < 200; pass++) {
        const { data, error }: any = await supabase.functions.invoke("enrich-clientes-viacep", {
          body: { only_missing: true },
        });
        if (error) throw error;
        const upd = data?.updated ?? 0;
        const res = data?.viacep_resolved ?? 0;
        const fail = data?.failed ?? 0;
        const proc = data?.processed ?? 0;
        totalUpdated += upd;
        totalResolved += res;
        totalFailed += fail;
        totalProcessed += proc;
        toast.loading(
          `Reprocessando: passo ${pass + 1} • ${totalProcessed} processados • ${totalUpdated} atualizados • ${totalFailed} falhas`,
          { id: tId }
        );
        // Para se nada foi atualizado neste passo (todos restantes falharam ou acabaram)
        if (data?.done || upd === 0) break;
      }

      const { data: syncData } = await supabase.rpc("sync_clients_to_orders");
      const ordUpdated = (syncData as any)?.updated ?? 0;

      toast.success(
        `Reprocessamento concluído: ${totalUpdated} atualizados em ${pass + 1} passos. ${totalFailed} CEPs sem retorno. ${ordUpdated} pedidos sincronizados.`,
        { id: tId }
      );
      qc.invalidateQueries({ queryKey: ["clientes"] });
      qc.invalidateQueries({ queryKey: ["carregamentos"] });
    } catch (err: any) {
      toast.error("Erro ao reprocessar: " + (err.message || err), { id: tId });
    } finally {
      setReprocessing(false);
    }
  };

  const renderPaginationItems = () => {
    const items = [];
    const maxVisible = 5;
    let start = Math.max(1, page - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start + 1 < maxVisible) start = Math.max(1, end - maxVisible + 1);
    if (start > 1) {
      items.push(<PaginationItem key={1}><PaginationLink onClick={() => setPage(1)} isActive={page === 1}>1</PaginationLink></PaginationItem>);
      if (start > 2) items.push(<PaginationItem key="e1"><PaginationEllipsis /></PaginationItem>);
    }
    for (let i = start; i <= end; i++) {
      items.push(<PaginationItem key={i}><PaginationLink onClick={() => setPage(i)} isActive={page === i}>{i}</PaginationLink></PaginationItem>);
    }
    if (end < totalPages) {
      if (end < totalPages - 1) items.push(<PaginationItem key="e2"><PaginationEllipsis /></PaginationItem>);
      items.push(<PaginationItem key={totalPages}><PaginationLink onClick={() => setPage(totalPages)} isActive={page === totalPages}>{totalPages}</PaginationLink></PaginationItem>);
    }
    return items;
  };

  return (
    <Layout>
      <div className="p-4 md:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Clientes</h1>
          <div className="flex gap-2">
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImport} />
            <Button variant="outline" size="sm" onClick={handleEnrichViaCep} disabled={enriching || reprocessing} className="flex-1 sm:flex-initial text-xs sm:text-sm">
              <RefreshCw className={`h-4 w-4 mr-1 ${enriching ? "animate-spin" : ""}`} /> {enriching ? "Atualizando..." : "Atualizar via CEP"}
            </Button>
            <Button variant="outline" size="sm" onClick={handleReprocessPending} disabled={enriching || reprocessing} className="flex-1 sm:flex-initial text-xs sm:text-sm">
              <RefreshCw className={`h-4 w-4 mr-1 ${reprocessing ? "animate-spin" : ""}`} /> {reprocessing ? "Reprocessando..." : "Reprocessar pendentes"}
            </Button>
            <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing} className="flex-1 sm:flex-initial text-xs sm:text-sm">
              <RefreshCw className={`h-4 w-4 mr-1 ${syncing ? "animate-spin" : ""}`} /> {syncing ? "Sincronizando..." : "Sincronizar pedidos"}
            </Button>
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={importing} className="flex-1 sm:flex-initial text-xs sm:text-sm">
              <Upload className="h-4 w-4 mr-1" /> {importing ? "Importando..." : "Importar"}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPdfDialogOpen(true)} className="flex-1 sm:flex-initial text-xs sm:text-sm">
              <FileText className="h-4 w-4 mr-1" /> Importar PDF
            </Button>
            <Button size="sm" onClick={openNew} className="flex-1 sm:flex-initial text-xs sm:text-sm"><Plus className="h-4 w-4 mr-1" /> Novo</Button>
          </div>
        </div>
        <ImportarClientesPdfDialog open={pdfDialogOpen} onOpenChange={setPdfDialogOpen} />
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
        </div>

        {isMobile ? (
          <div className="space-y-3">
            {isLoading ? (
              <p className="text-center py-8 text-muted-foreground text-sm">Carregando...</p>
            ) : paginated.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
                <Building2 className="h-8 w-8 opacity-40" />
                <span className="text-sm">Nenhum cliente encontrado</span>
              </div>
            ) : paginated.map((c: any) => (
              <Card key={c.id}>
                <CardContent className="p-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-muted-foreground">{c.codigo_cliente}</span>
                    <Badge variant={c.ativo ? "default" : "secondary"} className="text-[10px]">{c.ativo ? "Ativo" : "Inativo"}</Badge>
                  </div>
                  <p className="font-medium text-sm truncate">{c.nome_cliente}</p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex flex-col">
                      <span>{[c.cidade, c.uf].filter(Boolean).join(" - ") || "—"}</span>
                      {c.cep && <span className="font-mono text-[11px]">{maskCep(c.cep)}</span>}
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(c)}><Edit className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(c.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-border bg-card overflow-x-auto">
            <Table>
              <TableHeader><TableRow className="bg-muted/40">
                <SortableTableHead sort={sort} sortKey="codigo_cliente" onSort={toggleSort}>Código</SortableTableHead>
                <SortableTableHead sort={sort} sortKey="nome_cliente" onSort={toggleSort}>Nome</SortableTableHead>
                <SortableTableHead sort={sort} sortKey="cidade" onSort={toggleSort}>Cidade</SortableTableHead>
                <SortableTableHead sort={sort} sortKey="uf" onSort={toggleSort}>UF</SortableTableHead>
                <SortableTableHead sort={sort} sortKey="cep" onSort={toggleSort}>CEP</SortableTableHead>
                <SortableTableHead sort={sort} sortKey="ativo" onSort={toggleSort}>Status</SortableTableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
                ) : paginated.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <Building2 className="h-8 w-8 text-muted-foreground/40" />
                      <span>Nenhum cliente encontrado</span>
                    </div>
                  </TableCell></TableRow>
                ) : paginated.map((c: any) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono text-sm">{c.codigo_cliente}</TableCell>
                    <TableCell className="text-sm">{c.nome_cliente}</TableCell>
                    <TableCell className="text-sm">{c.cidade || "—"}</TableCell>
                    <TableCell className="text-sm">{c.uf || "—"}</TableCell>
                    <TableCell className="font-mono text-xs">{c.cep ? maskCep(c.cep) : "—"}</TableCell>
                    <TableCell><Badge variant={c.ativo ? "default" : "secondary"}>{c.ativo ? "Ativo" : "Inativo"}</Badge></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(c)}><Edit className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(c.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {filtered.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs sm:text-sm text-muted-foreground">
              Mostrando {startItem}–{endItem} de {filtered.length}
            </p>
            {totalPages > 1 && (
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious onClick={() => setPage(p => Math.max(1, p - 1))} className={page === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"} />
                  </PaginationItem>
                  {renderPaginationItems()}
                  <PaginationItem>
                    <PaginationNext onClick={() => setPage(p => Math.min(totalPages, p + 1))} className={page === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"} />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
          </div>
        )}

        <Dialog open={open} onOpenChange={(v) => { if (isSubmitting) return; setOpen(v); if (!v) setFormError(null); }}>
          <DialogContent
            className="w-[calc(100vw-2rem)] sm:w-full"
            onInteractOutside={(e) => { if (isSubmitting) e.preventDefault(); }}
            onEscapeKeyDown={(e) => { if (isSubmitting) e.preventDefault(); }}
          >
            <DialogHeader>
              <DialogTitle>{editing ? "Editar Cliente" : "Novo Cliente"}</DialogTitle>
              <DialogDescription>{editing ? "Edite os dados do cliente" : "Preencha os dados do novo cliente"}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {formError && (
                <Alert variant="destructive">
                  <AlertDescription className="text-xs">{formError}</AlertDescription>
                </Alert>
              )}
              <div><Label className="text-xs">Código</Label><Input value={form.codigo_cliente} onChange={(e) => setForm(f => ({ ...f, codigo_cliente: e.target.value }))} /></div>
              <div><Label className="text-xs">Nome</Label><Input value={form.nome_cliente} onChange={(e) => setForm(f => ({ ...f, nome_cliente: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">Cidade</Label><Input value={form.cidade} onChange={(e) => setForm(f => ({ ...f, cidade: e.target.value }))} /></div>
                <div><Label className="text-xs">UF</Label><Input value={form.uf} onChange={(e) => setForm(f => ({ ...f, uf: e.target.value.toUpperCase() }))} maxLength={2} placeholder="Ex: SP" /></div>
              </div>
              <div><Label className="text-xs">CEP</Label><Input value={form.cep} onChange={(e) => setForm(f => ({ ...f, cep: maskCep(e.target.value) }))} onBlur={handleCepBlur} maxLength={9} placeholder="00000-000" inputMode="numeric" /></div>
              <div className="flex items-center gap-2"><Switch checked={form.ativo} onCheckedChange={(v) => setForm(f => ({ ...f, ativo: v }))} /><Label className="text-xs">Ativo</Label></div>
              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2"><Button variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>Cancelar</Button><Button onClick={handleSubmit} disabled={isSubmitting}>{isSubmitting ? "Salvando..." : editing ? "Salvar" : "Criar"}</Button></div>
            </div>
          </DialogContent>
        </Dialog>
        <DeleteConfirmDialog
          open={!!deleteId}
          onOpenChange={(o) => !o && setDeleteId(null)}
          onConfirm={() => { if (deleteId) deleteMut.mutate(deleteId); setDeleteId(null); }}
          description="Tem certeza que deseja excluir este cliente? Esta ação não pode ser desfeita."
        />
      </div>
    </Layout>
  );
}
