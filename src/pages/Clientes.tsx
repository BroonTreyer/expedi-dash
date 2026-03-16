import { useState, useRef } from "react";
import { Layout } from "@/components/Layout";
import { useClientes, useCreateCliente, useUpdateCliente, useDeleteCliente } from "@/hooks/useClientes";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { DeleteConfirmDialog } from "@/components/dashboard/DeleteConfirmDialog";
import { Plus, Edit, Trash2, Search, Building2, Upload } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

export default function Clientes() {
  const { data: clientes = [], isLoading } = useClientes();
  const createMut = useCreateCliente();
  const updateMut = useUpdateCliente();
  const deleteMut = useDeleteCliente();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ codigo_cliente: "", nome_cliente: "", cidade: "", ativo: true });
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const filtered = clientes.filter((c: any) => {
    const s = search.toLowerCase();
    return !s || c.nome_cliente.toLowerCase().includes(s) || c.codigo_cliente.toLowerCase().includes(s) || (c.cidade && c.cidade.toLowerCase().includes(s));
  });

  const openNew = () => { setEditing(null); setForm({ codigo_cliente: "", nome_cliente: "", cidade: "", ativo: true }); setOpen(true); };
  const openEdit = (c: any) => { setEditing(c); setForm({ codigo_cliente: c.codigo_cliente, nome_cliente: c.nome_cliente, cidade: c.cidade || "", ativo: c.ativo }); setOpen(true); };

  const handleSubmit = () => {
    if (editing) { updateMut.mutate({ id: editing.id, ...form }); } else { createMut.mutate(form); }
    setOpen(false);
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
              <TableHead>Código</TableHead><TableHead>Nome</TableHead><TableHead>Cidade</TableHead><TableHead>Status</TableHead><TableHead className="w-[80px]"></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <Building2 className="h-8 w-8 text-muted-foreground/40" />
                    <span>Nenhum cliente encontrado</span>
                  </div>
                </TableCell></TableRow>
              ) : filtered.map((c: any) => (
                <TableRow key={c.id}>
                  <TableCell className="font-mono text-sm">{c.codigo_cliente}</TableCell>
                  <TableCell className="text-sm">{c.nome_cliente}</TableCell>
                  <TableCell className="text-sm">{c.cidade || "—"}</TableCell>
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
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="w-[calc(100vw-2rem)] sm:w-full">
            <DialogHeader>
              <DialogTitle>{editing ? "Editar Cliente" : "Novo Cliente"}</DialogTitle>
              <DialogDescription>{editing ? "Edite os dados do cliente" : "Preencha os dados do novo cliente"}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div><Label className="text-xs">Código</Label><Input value={form.codigo_cliente} onChange={(e) => setForm(f => ({ ...f, codigo_cliente: e.target.value }))} /></div>
              <div><Label className="text-xs">Nome</Label><Input value={form.nome_cliente} onChange={(e) => setForm(f => ({ ...f, nome_cliente: e.target.value }))} /></div>
              <div><Label className="text-xs">Cidade</Label><Input value={form.cidade} onChange={(e) => setForm(f => ({ ...f, cidade: e.target.value }))} /></div>
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
