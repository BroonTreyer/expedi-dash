import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useProdutosMp, useUpsertProdutoMp, useDeleteProdutoMp, type ProdutoMp } from "@/hooks/useProdutosMp";

export function ProdutosMpPanel() {
  const { data = [], isLoading } = useProdutosMp();
  const upsert = useUpsertProdutoMp();
  const del = useDeleteProdutoMp();
  const [edit, setEdit] = useState<Partial<ProdutoMp> | null>(null);

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button onClick={() => setEdit({ nome: "", unidade_padrao: "ton" })}><Plus className="h-4 w-4 mr-2" /> Novo produto</Button>
      </div>
      <Card><CardContent className="p-0 overflow-x-auto">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Código</TableHead><TableHead>Nome</TableHead><TableHead>Unidade</TableHead><TableHead className="text-right"></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={4} className="text-center py-6">Carregando...</TableCell></TableRow>}
            {!isLoading && data.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">Nenhum produto</TableCell></TableRow>}
            {data.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-mono text-xs">{p.codigo ?? "—"}</TableCell>
                <TableCell>{p.nome}</TableCell>
                <TableCell className="uppercase">{p.unidade_padrao}</TableCell>
                <TableCell className="text-right">
                  <Button size="icon" variant="ghost" onClick={() => setEdit(p)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => { if (window.confirm(`Excluir ${p.nome}?`)) del.mutate(p.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>

      <Dialog open={!!edit} onOpenChange={(v) => !v && setEdit(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{edit?.id ? "Editar" : "Novo"} produto</DialogTitle></DialogHeader>
          {edit && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div><Label>Código</Label><Input value={edit.codigo ?? ""} onChange={(e) => setEdit({ ...edit, codigo: e.target.value })} /></div>
              <div><Label>Unidade</Label><Input value={edit.unidade_padrao ?? "ton"} onChange={(e) => setEdit({ ...edit, unidade_padrao: e.target.value })} /></div>
              <div className="md:col-span-2"><Label>Nome *</Label><Input value={edit.nome ?? ""} onChange={(e) => setEdit({ ...edit, nome: e.target.value })} /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEdit(null)}>Cancelar</Button>
            <Button disabled={!edit?.nome?.trim() || upsert.isPending} onClick={async () => { await upsert.mutateAsync(edit as any); setEdit(null); }}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}