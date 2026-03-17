import { useState } from "react";
import { Layout } from "@/components/Layout";
import { useTiposCaminhao, useCreateTipoCaminhao, useDeleteTipoCaminhao } from "@/hooks/useTiposCaminhao";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SortableTableHead } from "@/components/ui/sortable-table-head";
import { useSortableTable } from "@/hooks/useSortableTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { DeleteConfirmDialog } from "@/components/dashboard/DeleteConfirmDialog";
import { Plus, Trash2, Truck } from "lucide-react";

export default function TiposCaminhao() {
  const { data: tiposRaw = [], isLoading } = useTiposCaminhao();
  const { sort, toggleSort, sortData } = useSortableTable();
  const tipos = sortData(tiposRaw, { nome_tipo: (t) => t.nome_tipo });
  const createMut = useCreateTipoCaminhao();
  const deleteMut = useDeleteTipoCaminhao();
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleSubmit = () => {
    if (!nome.trim()) return;
    createMut.mutate({ nome_tipo: nome.trim() });
    setNome("");
    setOpen(false);
  };

  return (
    <Layout>
      <div className="p-4 md:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h1 className="text-2xl font-bold tracking-tight">Tipos de Caminhão</h1>
          <Button onClick={() => { setNome(""); setOpen(true); }} className="w-full sm:w-auto"><Plus className="h-4 w-4 mr-1" /> Novo Tipo</Button>
        </div>
        <div className="rounded-lg border border-border bg-card overflow-x-auto max-w-full sm:max-w-lg">
          <Table>
            <TableHeader><TableRow className="bg-muted/40">
              <TableHead>Nome</TableHead><TableHead className="w-[60px]"></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={2} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : tipos.length === 0 ? (
                <TableRow><TableCell colSpan={2} className="text-center py-8 text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <Truck className="h-8 w-8 text-muted-foreground/40" />
                    <span>Nenhum tipo cadastrado</span>
                  </div>
                </TableCell></TableRow>
              ) : tipos.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="text-sm">{t.nome_tipo}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(t.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-sm w-[calc(100vw-2rem)] sm:w-full">
            <DialogHeader>
              <DialogTitle>Novo Tipo de Caminhão</DialogTitle>
              <DialogDescription>Informe o nome do tipo de caminhão</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div><Label className="text-xs">Nome</Label><Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Truck, Carreta, Bitrem" /></div>
              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2"><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={handleSubmit}>Criar</Button></div>
            </div>
          </DialogContent>
        </Dialog>
        <DeleteConfirmDialog
          open={!!deleteId}
          onOpenChange={(o) => !o && setDeleteId(null)}
          onConfirm={() => { if (deleteId) deleteMut.mutate(deleteId); setDeleteId(null); }}
          description="Tem certeza que deseja excluir este tipo de caminhão? Esta ação não pode ser desfeita."
        />
      </div>
    </Layout>
  );
}
