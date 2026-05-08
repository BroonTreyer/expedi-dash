import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2 } from "lucide-react";
import {
  useTransportadorasFinanceiro,
  useUpsertTransportadoraFin,
  useDeleteTransportadoraFin,
  type TransportadoraFin,
} from "@/hooks/useTransportadorasFinanceiro";

const empty: Partial<TransportadoraFin> = {
  nome: "",
  codigo: "",
  cnpj: "",
  pix_chave: "",
  pix_tipo: null,
  banco: "",
  agencia: "",
  conta: "",
  percentual_adiantamento_padrao: 50,
  ativo: true,
};

export function TransportadorasTab() {
  const { data = [] } = useTransportadorasFinanceiro();
  const upsert = useUpsertTransportadoraFin();
  const del = useDeleteTransportadoraFin();
  const [edit, setEdit] = useState<Partial<TransportadoraFin> | null>(null);

  const save = async () => {
    if (!edit?.nome?.trim()) return;
    await upsert.mutateAsync(edit as any);
    setEdit(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <p className="text-sm text-muted-foreground">Cadastro com código, PIX e % padrão de adiantamento.</p>
        <Button onClick={() => setEdit(empty)}><Plus className="h-4 w-4 mr-1" /> Nova</Button>
      </div>

      <Card className="p-0 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Código</TableHead>
              <TableHead>CNPJ</TableHead>
              <TableHead>PIX</TableHead>
              <TableHead className="text-right">% Adt. padrão</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-6">Nenhuma transportadora cadastrada</TableCell></TableRow>
            )}
            {data.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="font-medium">{t.nome}</TableCell>
                <TableCell className="text-xs">{t.codigo ?? "—"}</TableCell>
                <TableCell className="text-xs">{t.cnpj ?? "—"}</TableCell>
                <TableCell className="text-xs">{t.pix_chave ? `${t.pix_chave}${t.pix_tipo ? ` (${t.pix_tipo})` : ""}` : "—"}</TableCell>
                <TableCell className="text-right text-xs">{Number(t.percentual_adiantamento_padrao)}%</TableCell>
                <TableCell><Badge variant={t.ativo ? "default" : "outline"}>{t.ativo ? "Ativa" : "Inativa"}</Badge></TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEdit(t)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { if (confirm(`Remover ${t.nome}?`)) del.mutate(t.id); }}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>{edit?.id ? "Editar" : "Nova"} Transportadora</DialogTitle></DialogHeader>
          {edit && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <Label>Nome *</Label>
                <Input value={edit.nome ?? ""} onChange={(e) => setEdit({ ...edit, nome: e.target.value })} />
              </div>
              <div>
                <Label>Código</Label>
                <Input value={edit.codigo ?? ""} onChange={(e) => setEdit({ ...edit, codigo: e.target.value })} placeholder="Ex: 27308" />
              </div>
              <div>
                <Label>CNPJ</Label>
                <Input value={edit.cnpj ?? ""} onChange={(e) => setEdit({ ...edit, cnpj: e.target.value })} placeholder="00.000.000/0000-00" />
              </div>
              <div>
                <Label>Chave PIX</Label>
                <Input value={edit.pix_chave ?? ""} onChange={(e) => setEdit({ ...edit, pix_chave: e.target.value })} />
              </div>
              <div>
                <Label>Tipo PIX</Label>
                <select
                  value={edit.pix_tipo ?? ""}
                  onChange={(e) => setEdit({ ...edit, pix_tipo: (e.target.value || null) as any })}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">—</option>
                  <option value="cnpj">CNPJ</option>
                  <option value="cpf">CPF</option>
                  <option value="email">E-mail</option>
                  <option value="telefone">Telefone</option>
                  <option value="aleatoria">Aleatória</option>
                </select>
              </div>
              <div>
                <Label>Banco</Label>
                <Input value={edit.banco ?? ""} onChange={(e) => setEdit({ ...edit, banco: e.target.value })} />
              </div>
              <div>
                <Label>Agência</Label>
                <Input value={edit.agencia ?? ""} onChange={(e) => setEdit({ ...edit, agencia: e.target.value })} />
              </div>
              <div>
                <Label>Conta</Label>
                <Input value={edit.conta ?? ""} onChange={(e) => setEdit({ ...edit, conta: e.target.value })} />
              </div>
              <div>
                <Label>% Adiantamento padrão</Label>
                <Input type="number" min={0} max={100} step="0.5" value={edit.percentual_adiantamento_padrao ?? 50} onChange={(e) => setEdit({ ...edit, percentual_adiantamento_padrao: Number(e.target.value || 0) })} />
              </div>
              <div className="flex items-end gap-2">
                <input type="checkbox" id="ativo" checked={edit.ativo ?? true} onChange={(e) => setEdit({ ...edit, ativo: e.target.checked })} />
                <Label htmlFor="ativo">Ativa</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEdit(null)}>Cancelar</Button>
            <Button onClick={save} disabled={upsert.isPending || !edit?.nome?.trim()}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}