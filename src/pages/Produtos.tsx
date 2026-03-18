import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { useProdutos, useCreateProduto, useUpdateProduto, useDeleteProduto } from "@/hooks/useProdutos";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SortableTableHead } from "@/components/ui/sortable-table-head";
import { useSortableTable } from "@/hooks/useSortableTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { DeleteConfirmDialog } from "@/components/dashboard/DeleteConfirmDialog";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious, PaginationEllipsis } from "@/components/ui/pagination";
import { Plus, Edit, Trash2, Search, Package } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

const PAGE_SIZE = 50;

export default function Produtos() {
  const { data: produtos = [], isLoading } = useProdutos();
  const createMut = useCreateProduto();
  const updateMut = useUpdateProduto();
  const deleteMut = useDeleteProduto();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [form, setForm] = useState({ codigo_produto: "", nome_produto: "", peso_padrao: 0, ativo: true });
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { sort, toggleSort, sortData } = useSortableTable();

  useEffect(() => { setPage(1); }, [search]);

  const filtered = sortData(produtos.filter((p) => {
    const s = search.toLowerCase();
    return !s || p.nome_produto.toLowerCase().includes(s) || p.codigo_produto.toLowerCase().includes(s);
  }), {
    codigo_produto: (p) => p.codigo_produto,
    nome_produto: (p) => p.nome_produto,
    peso_padrao: (p) => p.peso_padrao ?? 0,
    ativo: (p) => p.ativo,
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const startItem = filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const endItem = Math.min(page * PAGE_SIZE, filtered.length);

  const openNew = () => { setEditing(null); setForm({ codigo_produto: "", nome_produto: "", peso_padrao: 0, ativo: true }); setOpen(true); };
  const openEdit = (p: any) => { setEditing(p); setForm({ codigo_produto: p.codigo_produto, nome_produto: p.nome_produto, peso_padrao: p.peso_padrao ?? 0, ativo: p.ativo }); setOpen(true); };

  const isSubmitting = createMut.isPending || updateMut.isPending;
  const handleSubmit = () => {
    if (editing) { updateMut.mutate({ id: editing.id, ...form }, { onSuccess: () => setOpen(false) }); }
    else { createMut.mutate(form, { onSuccess: () => setOpen(false) }); }
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
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Produtos</h1>
          <Button size="sm" onClick={openNew} className="w-full sm:w-auto text-xs sm:text-sm"><Plus className="h-4 w-4 mr-1" /> Novo Produto</Button>
        </div>
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
                <Package className="h-8 w-8 opacity-40" />
                <span className="text-sm">Nenhum produto encontrado</span>
              </div>
            ) : paginated.map((p) => (
              <Card key={p.id}>
                <CardContent className="p-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-muted-foreground">{p.codigo_produto}</span>
                    <Badge variant={p.ativo ? "default" : "secondary"} className="text-[10px]">{p.ativo ? "Ativo" : "Inativo"}</Badge>
                  </div>
                  <p className="font-medium text-sm truncate">{p.nome_produto}</p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Peso: {(p.peso_padrao ?? 0).toLocaleString("pt-BR")} kg</span>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(p)}><Edit className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(p.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
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
                <SortableTableHead sort={sort} sortKey="codigo_produto" onSort={toggleSort}>Código</SortableTableHead>
                <SortableTableHead sort={sort} sortKey="nome_produto" onSort={toggleSort}>Nome</SortableTableHead>
                <SortableTableHead sort={sort} sortKey="peso_padrao" onSort={toggleSort} className="text-right">Peso Padrão (kg)</SortableTableHead>
                <SortableTableHead sort={sort} sortKey="ativo" onSort={toggleSort}>Status</SortableTableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
                ) : paginated.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    <div className="flex flex-col items-center gap-2"><Package className="h-8 w-8 text-muted-foreground/40" /><span>Nenhum produto encontrado</span></div>
                  </TableCell></TableRow>
                ) : paginated.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-sm">{p.codigo_produto}</TableCell>
                    <TableCell className="text-sm">{p.nome_produto}</TableCell>
                    <TableCell className="text-sm text-right">{(p.peso_padrao ?? 0).toLocaleString("pt-BR")}</TableCell>
                    <TableCell><Badge variant={p.ativo ? "default" : "secondary"}>{p.ativo ? "Ativo" : "Inativo"}</Badge></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(p)}><Edit className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(p.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
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
            <p className="text-xs sm:text-sm text-muted-foreground">Mostrando {startItem}–{endItem} de {filtered.length}</p>
            {totalPages > 1 && (
              <Pagination>
                <PaginationContent>
                  <PaginationItem><PaginationPrevious onClick={() => setPage(p => Math.max(1, p - 1))} className={page === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"} /></PaginationItem>
                  {renderPaginationItems()}
                  <PaginationItem><PaginationNext onClick={() => setPage(p => Math.min(totalPages, p + 1))} className={page === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"} /></PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
          </div>
        )}

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="w-[calc(100vw-2rem)] sm:w-full">
            <DialogHeader>
              <DialogTitle>{editing ? "Editar Produto" : "Novo Produto"}</DialogTitle>
              <DialogDescription>{editing ? "Edite os dados do produto" : "Preencha os dados do novo produto"}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div><Label className="text-xs">Código</Label><Input value={form.codigo_produto} onChange={(e) => setForm(f => ({ ...f, codigo_produto: e.target.value }))} /></div>
              <div><Label className="text-xs">Nome</Label><Input value={form.nome_produto} onChange={(e) => setForm(f => ({ ...f, nome_produto: e.target.value }))} /></div>
              <div><Label className="text-xs">Peso Padrão (kg)</Label><Input type="number" value={form.peso_padrao} onChange={(e) => setForm(f => ({ ...f, peso_padrao: Number(e.target.value) }))} /></div>
              <div className="flex items-center gap-2"><Switch checked={form.ativo} onCheckedChange={(v) => setForm(f => ({ ...f, ativo: v }))} /><Label className="text-xs">Ativo</Label></div>
              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2"><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={handleSubmit} disabled={isSubmitting}>{isSubmitting ? "Salvando..." : editing ? "Salvar" : "Criar"}</Button></div>
            </div>
          </DialogContent>
        </Dialog>
        <DeleteConfirmDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)} onConfirm={() => { if (deleteId) deleteMut.mutate(deleteId); setDeleteId(null); }} description="Tem certeza que deseja excluir este produto? Esta ação não pode ser desfeita." />
      </div>
    </Layout>
  );
}
