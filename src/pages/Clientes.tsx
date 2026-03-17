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
import { DeleteConfirmDialog } from "@/components/dashboard/DeleteConfirmDialog";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious, PaginationEllipsis } from "@/components/ui/pagination";
import { Plus, Edit, Trash2, Search, Building2, Upload } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

const PAGE_SIZE = 50;

export default function Clientes() {
  const { data: clientes = [], isLoading } = useClientes();
  const createMut = useCreateCliente();
  const updateMut = useUpdateCliente();
  const deleteMut = useDeleteCliente();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [form, setForm] = useState({ codigo_cliente: "", nome_cliente: "", cidade: "", uf: "", ativo: true });
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
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

  const openNew = () => { setEditing(null); setForm({ codigo_cliente: "", nome_cliente: "", cidade: "", uf: "", ativo: true }); setOpen(true); };
  const openEdit = (c: any) => { setEditing(c); setForm({ codigo_cliente: c.codigo_cliente, nome_cliente: c.nome_cliente, cidade: c.cidade || "", uf: c.uf || "", ativo: c.ativo }); setOpen(true); };

  const isSubmitting = createMut.isPending || updateMut.isPending;
  const handleSubmit = () => {
    if (editing) { updateMut.mutate({ id: editing.id, ...form }, { onSuccess: () => setOpen(false) }); } else { createMut.mutate(form, { onSuccess: () => setOpen(false) }); }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

      const records = rows.slice(1)
        .filter(r => r[0] != null && String(r[0]).trim())
        .map(r => ({
          codigo_cliente: String(r[0]).trim(),
          nome_cliente: String(r[1] || "").trim(),
          cidade: String(r[2] || "").trim() || null,
          uf: String(r[3] || "").trim() || null,
          ativo: true,
        }));

      let imported = 0;
      for (let i = 0; i < records.length; i += 200) {
        const batch = records.slice(i, i + 200);
        const { error } = await supabase.from("clientes").upsert(batch, { onConflict: "codigo_cliente" } as any);
        if (error) { toast.error(`Erro no lote ${i}: ${error.message}`); setImporting(false); return; }
        imported += batch.length;
      }

      toast.success(`${imported} clientes importados com sucesso!`);
      qc.invalidateQueries({ queryKey: ["clientes"] });
    } catch (err: any) {
      toast.error("Erro ao importar: " + err.message);
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
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
          <h1 className="text-2xl font-bold tracking-tight">Clientes</h1>
          <div className="flex gap-2">
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImport} />
            <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={importing} className="w-full sm:w-auto">
              <Upload className="h-4 w-4 mr-1" /> {importing ? "Importando..." : "Importar XLSX"}
            </Button>
            <Button onClick={openNew} className="w-full sm:w-auto"><Plus className="h-4 w-4 mr-1" /> Novo Cliente</Button>
          </div>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
        </div>
        <div className="rounded-lg border border-border bg-card overflow-x-auto">
          <Table>
            <TableHeader><TableRow className="bg-muted/40">
              <SortableTableHead sort={sort} sortKey="codigo_cliente" onSort={toggleSort}>Código</SortableTableHead>
              <SortableTableHead sort={sort} sortKey="nome_cliente" onSort={toggleSort}>Nome</SortableTableHead>
              <SortableTableHead sort={sort} sortKey="cidade" onSort={toggleSort}>Cidade</SortableTableHead>
              <SortableTableHead sort={sort} sortKey="uf" onSort={toggleSort}>UF</SortableTableHead>
              <SortableTableHead sort={sort} sortKey="ativo" onSort={toggleSort}>Status</SortableTableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : paginated.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
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

        {filtered.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Mostrando {startItem}–{endItem} de {filtered.length} clientes
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

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="w-[calc(100vw-2rem)] sm:w-full">
            <DialogHeader>
              <DialogTitle>{editing ? "Editar Cliente" : "Novo Cliente"}</DialogTitle>
              <DialogDescription>{editing ? "Edite os dados do cliente" : "Preencha os dados do novo cliente"}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div><Label className="text-xs">Código</Label><Input value={form.codigo_cliente} onChange={(e) => setForm(f => ({ ...f, codigo_cliente: e.target.value }))} /></div>
              <div><Label className="text-xs">Nome</Label><Input value={form.nome_cliente} onChange={(e) => setForm(f => ({ ...f, nome_cliente: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">Cidade</Label><Input value={form.cidade} onChange={(e) => setForm(f => ({ ...f, cidade: e.target.value }))} /></div>
                <div><Label className="text-xs">UF</Label><Input value={form.uf} onChange={(e) => setForm(f => ({ ...f, uf: e.target.value.toUpperCase() }))} maxLength={2} placeholder="Ex: SP" /></div>
              </div>
              <div className="flex items-center gap-2"><Switch checked={form.ativo} onCheckedChange={(v) => setForm(f => ({ ...f, ativo: v }))} /><Label className="text-xs">Ativo</Label></div>
              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2"><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={handleSubmit}>{editing ? "Salvar" : "Criar"}</Button></div>
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
