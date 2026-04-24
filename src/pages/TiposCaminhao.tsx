import { useState } from "react";
import { Layout } from "@/components/Layout";
import { useTiposCaminhao, useCreateTipoCaminhao, useDeleteTipoCaminhao, useUpdateTipoCaminhao } from "@/hooks/useTiposCaminhao";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SortableTableHead } from "@/components/ui/sortable-table-head";
import { useSortableTable } from "@/hooks/useSortableTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { DeleteConfirmDialog } from "@/components/dashboard/DeleteConfirmDialog";
import { Plus, Trash2, Truck, Pencil } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

export default function TiposCaminhao() {
  const { data: tiposRaw = [], isLoading } = useTiposCaminhao();
  const { sort, toggleSort, sortData } = useSortableTable();
  const tipos = sortData(tiposRaw, { nome_tipo: (t) => t.nome_tipo });
  const createMut = useCreateTipoCaminhao();
  const updateMut = useUpdateTipoCaminhao();
  const deleteMut = useDeleteTipoCaminhao();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [consumo, setConsumo] = useState<string>("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const openNew = () => { setEditingId(null); setNome(""); setConsumo(""); setOpen(true); };
  const openEdit = (t: any) => {
    setEditingId(t.id);
    setNome(t.nome_tipo);
    setConsumo(t.consumo_km_litro != null ? String(t.consumo_km_litro) : "");
    setOpen(true);
  };

  const handleSubmit = () => {
    if (!nome.trim()) return;
    const payload = {
      nome_tipo: nome.trim(),
      consumo_km_litro: consumo ? Number(consumo.replace(",", ".")) : null,
    };
    if (editingId) {
      updateMut.mutate({ id: editingId, ...payload }, { onSuccess: () => setOpen(false) });
    } else {
      createMut.mutate(payload, { onSuccess: () => setOpen(false) });
    }
  };

  return (
    <Layout>
      <div className="p-4 md:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Tipos de Caminhão</h1>
          <Button size="sm" onClick={openNew} className="w-full sm:w-auto text-xs sm:text-sm"><Plus className="h-4 w-4 mr-1" /> Novo Tipo</Button>
        </div>

        {isMobile ? (
          <div className="space-y-3 max-w-full">
            {isLoading ? (
              <p className="text-center py-8 text-muted-foreground text-sm">Carregando...</p>
            ) : tipos.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
                <Truck className="h-8 w-8 opacity-40" />
                <span className="text-sm">Nenhum tipo cadastrado</span>
              </div>
            ) : tipos.map((t) => (
              <Card key={t.id}>
                <CardContent className="p-3 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{t.nome_tipo}</span>
                    {(t as any).consumo_km_litro != null && (
                      <span className="text-[11px] text-muted-foreground">{(t as any).consumo_km_litro} km/L</span>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(t)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(t.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-border bg-card overflow-x-auto max-w-full sm:max-w-2xl">
            <Table>
              <TableHeader><TableRow className="bg-muted/40">
                <SortableTableHead sort={sort} sortKey="nome_tipo" onSort={toggleSort}>Nome</SortableTableHead>
                <TableHead className="w-[120px]">Consumo (km/L)</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
                ) : tipos.length === 0 ? (
                  <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                    <div className="flex flex-col items-center gap-2"><Truck className="h-8 w-8 text-muted-foreground/40" /><span>Nenhum tipo cadastrado</span></div>
                  </TableCell></TableRow>
                ) : tipos.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="text-sm">{t.nome_tipo}</TableCell>
                    <TableCell className="text-sm">{(t as any).consumo_km_litro ?? "—"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(t)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(t.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-sm w-[calc(100vw-2rem)] sm:w-full">
            <DialogHeader>
              <DialogTitle>{editingId ? "Editar" : "Novo"} Tipo de Caminhão</DialogTitle>
              <DialogDescription>Nome do tipo e consumo médio (km/L) para cálculo de combustível.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div><Label className="text-xs">Nome</Label><Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Truck, Carreta, Bitrem" /></div>
              <div>
                <Label className="text-xs">Consumo médio (km/L)</Label>
                <Input type="number" step="0.1" value={consumo} onChange={(e) => setConsumo(e.target.value)} placeholder="Ex: 3.5" />
              </div>
              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2">
                <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button onClick={handleSubmit} disabled={createMut.isPending || updateMut.isPending}>
                  {createMut.isPending || updateMut.isPending ? "Salvando..." : editingId ? "Salvar" : "Criar"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        <DeleteConfirmDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)} onConfirm={() => { if (deleteId) deleteMut.mutate(deleteId); setDeleteId(null); }} description="Tem certeza que deseja excluir este tipo de caminhão? Esta ação não pode ser desfeita." />
      </div>
    </Layout>
  );
}
