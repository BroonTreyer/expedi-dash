import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useFornecedoresMp, useUpsertFornecedorMp, useDeleteFornecedorMp, type FornecedorMp } from "@/hooks/useFornecedoresMp";

export function FornecedoresMpPanel() {
  const { data = [], isLoading } = useFornecedoresMp();
  const upsert = useUpsertFornecedorMp();
  const del = useDeleteFornecedorMp();
  const [edit, setEdit] = useState<Partial<FornecedorMp> | null>(null);

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button onClick={() => setEdit({ nome: "" })}><Plus className="h-4 w-4 mr-2" /> Novo fornecedor</Button>
      </div>
      <Card><CardContent className="p-0 overflow-x-auto">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Nome</TableHead><TableHead>CNPJ/CPF</TableHead><TableHead>Cidade/UF</TableHead>
            <TableHead>Telefone</TableHead><TableHead>E-mail</TableHead><TableHead className="text-right"></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={6} className="text-center py-6">Carregando...</TableCell></TableRow>}
            {!isLoading && data.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">Nenhum fornecedor</TableCell></TableRow>}
            {data.map((f) => (
              <TableRow key={f.id}>
                <TableCell className="font-medium">{f.nome}</TableCell>
                <TableCell className="font-mono text-xs">{f.cnpj_cpf ?? "—"}</TableCell>
                <TableCell>{[f.cidade, f.uf].filter(Boolean).join("/") || "—"}</TableCell>
                <TableCell>{f.telefone ?? "—"}</TableCell>
                <TableCell>{f.email ?? "—"}</TableCell>
                <TableCell className="text-right">
                  <Button size="icon" variant="ghost" onClick={() => setEdit(f)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => { if (window.confirm(`Excluir ${f.nome}?`)) del.mutate(f.id); }}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>

      <Dialog open={!!edit} onOpenChange={(v) => !v && setEdit(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{edit?.id ? "Editar" : "Novo"} fornecedor</DialogTitle></DialogHeader>
          {edit && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2"><Label>Nome *</Label><Input value={edit.nome ?? ""} onChange={(e) => setEdit({ ...edit, nome: e.target.value })} /></div>
              <div><Label>CNPJ/CPF</Label><Input value={edit.cnpj_cpf ?? ""} onChange={(e) => setEdit({ ...edit, cnpj_cpf: e.target.value })} /></div>
              <div><Label>Telefone</Label><Input value={edit.telefone ?? ""} onChange={(e) => setEdit({ ...edit, telefone: e.target.value })} /></div>
              <div><Label>Cidade</Label><Input value={edit.cidade ?? ""} onChange={(e) => setEdit({ ...edit, cidade: e.target.value })} /></div>
              <div><Label>UF</Label><Input maxLength={2} value={edit.uf ?? ""} onChange={(e) => setEdit({ ...edit, uf: e.target.value.toUpperCase() })} /></div>
              <div className="md:col-span-2"><Label>E-mail</Label><Input type="email" value={edit.email ?? ""} onChange={(e) => setEdit({ ...edit, email: e.target.value })} /></div>
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