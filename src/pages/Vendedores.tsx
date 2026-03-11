import { useState } from "react";
import { Layout } from "@/components/Layout";
import { useVendedores, useCreateVendedor, useUpdateVendedor, useDeleteVendedor } from "@/hooks/useVendedores";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Search } from "lucide-react";

export default function Vendedores() {
  const { data: vendedores = [], isLoading } = useVendedores();
  const createMut = useCreateVendedor();
  const updateMut = useUpdateVendedor();
  const deleteMut = useDeleteVendedor();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ codigo_vendedor: "", nome_vendedor: "", ativo: true });

  const filtered = vendedores.filter((v) => {
    const s = search.toLowerCase();
    return !s || v.nome_vendedor.toLowerCase().includes(s) || v.codigo_vendedor.toLowerCase().includes(s);
  });

  const openNew = () => { setEditing(null); setForm({ codigo_vendedor: "", nome_vendedor: "", ativo: true }); setOpen(true); };
  const openEdit = (v: any) => { setEditing(v); setForm({ codigo_vendedor: v.codigo_vendedor, nome_vendedor: v.nome_vendedor, ativo: v.ativo }); setOpen(true); };

  const handleSubmit = () => {
    if (editing) { updateMut.mutate({ id: editing.id, ...form }); } else { createMut.mutate(form); }
    setOpen(false);
  };

  return (
    <Layout>
      <div className="p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Vendedores</h1>
          <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Novo Vendedor</Button>
        </div>
        <div className="relative w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
        </div>
        <div className="rounded-lg border border-border bg-card">
          <Table>
            <TableHeader><TableRow className="bg-muted/40">
              <TableHead>Código</TableHead><TableHead>Nome</TableHead><TableHead>Status</TableHead><TableHead className="w-[80px]"></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {filtered.map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="font-mono text-sm">{v.codigo_vendedor}</TableCell>
                  <TableCell className="text-sm">{v.nome_vendedor}</TableCell>
                  <TableCell><Badge variant={v.ativo ? "default" : "secondary"}>{v.ativo ? "Ativo" : "Inativo"}</Badge></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(v)}><Edit className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteMut.mutate(v.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? "Editar Vendedor" : "Novo Vendedor"}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label className="text-xs">Código</Label><Input value={form.codigo_vendedor} onChange={(e) => setForm(f => ({ ...f, codigo_vendedor: e.target.value }))} /></div>
              <div><Label className="text-xs">Nome</Label><Input value={form.nome_vendedor} onChange={(e) => setForm(f => ({ ...f, nome_vendedor: e.target.value }))} /></div>
              <div className="flex items-center gap-2"><Switch checked={form.ativo} onCheckedChange={(v) => setForm(f => ({ ...f, ativo: v }))} /><Label className="text-xs">Ativo</Label></div>
              <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={handleSubmit}>{editing ? "Salvar" : "Criar"}</Button></div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
