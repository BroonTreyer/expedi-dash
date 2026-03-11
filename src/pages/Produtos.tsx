import { useState } from "react";
import { Layout } from "@/components/Layout";
import { useProdutos, useCreateProduto, useUpdateProduto, useDeleteProduto } from "@/hooks/useProdutos";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { DeleteConfirmDialog } from "@/components/dashboard/DeleteConfirmDialog";
import { Plus, Edit, Trash2, Search, Package } from "lucide-react";

export default function Produtos() {
  const { data: produtos = [], isLoading } = useProdutos();
  const createMut = useCreateProduto();
  const updateMut = useUpdateProduto();
  const deleteMut = useDeleteProduto();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ codigo_produto: "", nome_produto: "", peso_padrao: 0, ativo: true });
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filtered = produtos.filter((p) => {
    const s = search.toLowerCase();
    return !s || p.nome_produto.toLowerCase().includes(s) || p.codigo_produto.toLowerCase().includes(s);
  });

  const openNew = () => { setEditing(null); setForm({ codigo_produto: "", nome_produto: "", peso_padrao: 0, ativo: true }); setOpen(true); };
  const openEdit = (p: any) => { setEditing(p); setForm({ codigo_produto: p.codigo_produto, nome_produto: p.nome_produto, peso_padrao: p.peso_padrao ?? 0, ativo: p.ativo }); setOpen(true); };

  const handleSubmit = () => {
    if (editing) {
      updateMut.mutate({ id: editing.id, ...form });
    } else {
      createMut.mutate(form);
    }
    setOpen(false);
  };

  return (
    <Layout>
      <div className="p-4 md:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h1 className="text-2xl font-bold tracking-tight">Produtos</h1>
          <Button onClick={openNew} className="w-full sm:w-auto"><Plus className="h-4 w-4 mr-1" /> Novo Produto</Button>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
        </div>
        <div className="rounded-lg border border-border bg-card overflow-x-auto">
          <Table>
            <TableHeader><TableRow className="bg-muted/40">
              <TableHead>Código</TableHead><TableHead>Nome</TableHead><TableHead className="text-right">Peso Padrão (kg)</TableHead><TableHead>Status</TableHead><TableHead className="w-[80px]"></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <Package className="h-8 w-8 text-muted-foreground/40" />
                    <span>Nenhum produto encontrado</span>
                  </div>
                </TableCell></TableRow>
              ) : filtered.map((p) => (
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
              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2"><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={handleSubmit}>{editing ? "Salvar" : "Criar"}</Button></div>
            </div>
          </DialogContent>
        </Dialog>
        <DeleteConfirmDialog
          open={!!deleteId}
          onOpenChange={(o) => !o && setDeleteId(null)}
          onConfirm={() => { if (deleteId) deleteMut.mutate(deleteId); setDeleteId(null); }}
          description="Tem certeza que deseja excluir este produto? Esta ação não pode ser desfeita."
        />
      </div>
    </Layout>
  );
}
