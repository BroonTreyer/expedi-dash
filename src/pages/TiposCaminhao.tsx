import { useState } from "react";
import { Layout } from "@/components/Layout";
import { useTiposCaminhao, useCreateTipoCaminhao, useDeleteTipoCaminhao } from "@/hooks/useTiposCaminhao";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Trash2 } from "lucide-react";

export default function TiposCaminhao() {
  const { data: tipos = [] } = useTiposCaminhao();
  const createMut = useCreateTipoCaminhao();
  const deleteMut = useDeleteTipoCaminhao();
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState("");

  const handleSubmit = () => {
    if (!nome.trim()) return;
    createMut.mutate({ nome_tipo: nome.trim() });
    setNome("");
    setOpen(false);
  };

  return (
    <Layout>
      <div className="p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Tipos de Caminhão</h1>
          <Button onClick={() => { setNome(""); setOpen(true); }}><Plus className="h-4 w-4 mr-1" /> Novo Tipo</Button>
        </div>
        <div className="rounded-lg border border-border bg-card max-w-lg">
          <Table>
            <TableHeader><TableRow className="bg-muted/40">
              <TableHead>Nome</TableHead><TableHead className="w-[60px]"></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {tipos.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="text-sm">{t.nome_tipo}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteMut.mutate(t.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Novo Tipo de Caminhão</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label className="text-xs">Nome</Label><Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Truck, Carreta, Bitrem" /></div>
              <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={handleSubmit}>Criar</Button></div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
