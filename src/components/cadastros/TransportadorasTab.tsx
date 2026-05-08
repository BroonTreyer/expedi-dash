import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

function StatusBadge({ ativo }: { ativo: boolean }) {
  if (ativo) {
    return (
      <Badge
        variant="outline"
        className="border-emerald-300 bg-emerald-100 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
      >
        Ativa
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-muted-foreground">
      Inativa
    </Badge>
  );
}

export function TransportadorasTab() {
  const { data = [] } = useTransportadorasFinanceiro();
  const upsert = useUpsertTransportadoraFin();
  const del = useDeleteTransportadoraFin();
  const [edit, setEdit] = useState<Partial<TransportadoraFin> | null>(null);
  const [toDelete, setToDelete] = useState<TransportadoraFin | null>(null);

  const save = async () => {
    if (!edit?.nome?.trim()) return;
    await upsert.mutateAsync(edit as any);
    setEdit(null);
  };

  return (
    <div className="space-y-4">
      {/* Header coeso */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <h2 className="text-base font-semibold leading-tight">
            Transportadoras cadastradas
          </h2>
          <p className="text-sm text-muted-foreground">
            Cadastro com código, PIX e % padrão de adiantamento.
          </p>
        </div>
        <Button onClick={() => setEdit(empty)} size="sm">
          <Plus className="h-4 w-4 mr-1" /> Nova
        </Button>
      </div>

      {/* Desktop: tabela */}
      <Card className="hidden md:block p-0 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[220px] whitespace-nowrap">Nome</TableHead>
              <TableHead className="w-[110px] whitespace-nowrap">Código</TableHead>
              <TableHead className="w-[150px] whitespace-nowrap">CNPJ</TableHead>
              <TableHead className="min-w-[200px] whitespace-nowrap">PIX</TableHead>
              <TableHead className="w-[110px] text-right whitespace-nowrap">
                % Adt. padrão
              </TableHead>
              <TableHead className="w-[100px] whitespace-nowrap">Status</TableHead>
              <TableHead className="w-[88px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center text-sm text-muted-foreground py-6"
                >
                  Nenhuma transportadora cadastrada
                </TableCell>
              </TableRow>
            )}
            {data.map((t) => (
              <TableRow key={t.id} className="hover:bg-muted/40">
                <TableCell className="font-medium">{t.nome}</TableCell>
                <TableCell className="text-xs">{t.codigo ?? "—"}</TableCell>
                <TableCell className="text-xs">{t.cnpj ?? "—"}</TableCell>
                <TableCell className="text-xs">
                  {t.pix_chave
                    ? `${t.pix_chave}${t.pix_tipo ? ` (${t.pix_tipo})` : ""}`
                    : "—"}
                </TableCell>
                <TableCell className="text-right text-xs">
                  {Number(t.percentual_adiantamento_padrao)}%
                </TableCell>
                <TableCell>
                  <StatusBadge ativo={!!t.ativo} />
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setEdit(t)}
                      aria-label="Editar"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setToDelete(t)}
                      aria-label="Remover"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Mobile: cards */}
      <div className="md:hidden space-y-2">
        {data.length === 0 && (
          <Card className="p-4 text-center text-sm text-muted-foreground">
            Nenhuma transportadora cadastrada
          </Card>
        )}
        {data.map((t) => (
          <Card key={t.id} className="p-3 space-y-1.5">
            <div className="flex items-start justify-between gap-2">
              <div className="font-medium leading-tight min-w-0 break-words">
                {t.nome}
              </div>
              <StatusBadge ativo={!!t.ativo} />
            </div>
            <div className="text-xs text-muted-foreground">
              {t.codigo ? `Cód. ${t.codigo}` : "Sem código"}
              {t.cnpj ? ` · ${t.cnpj}` : ""}
            </div>
            {t.pix_chave && (
              <div className="text-xs text-muted-foreground truncate">
                PIX: {t.pix_chave}
                {t.pix_tipo ? ` (${t.pix_tipo})` : ""}
              </div>
            )}
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-muted-foreground">
                Adt. padrão:{" "}
                <span className="font-medium text-foreground">
                  {Number(t.percentual_adiantamento_padrao)}%
                </span>
              </span>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setEdit(t)}
                  aria-label="Editar"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setToDelete(t)}
                  aria-label="Remover"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Diálogo de edição */}
      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {edit?.id ? "Editar" : "Nova"} Transportadora
            </DialogTitle>
          </DialogHeader>
          {edit && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <Label>Nome *</Label>
                <Input
                  value={edit.nome ?? ""}
                  onChange={(e) => setEdit({ ...edit, nome: e.target.value })}
                />
              </div>
              <div>
                <Label>Código</Label>
                <Input
                  value={edit.codigo ?? ""}
                  onChange={(e) => setEdit({ ...edit, codigo: e.target.value })}
                  placeholder="Ex: 27308"
                />
              </div>
              <div>
                <Label>CNPJ</Label>
                <Input
                  value={edit.cnpj ?? ""}
                  onChange={(e) => setEdit({ ...edit, cnpj: e.target.value })}
                  placeholder="00.000.000/0000-00"
                />
              </div>
              <div>
                <Label>Chave PIX</Label>
                <Input
                  value={edit.pix_chave ?? ""}
                  onChange={(e) =>
                    setEdit({ ...edit, pix_chave: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Tipo PIX</Label>
                <Select
                  value={edit.pix_tipo ?? "none"}
                  onValueChange={(v) =>
                    setEdit({
                      ...edit,
                      pix_tipo: (v === "none" ? null : v) as any,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    <SelectItem value="cnpj">CNPJ</SelectItem>
                    <SelectItem value="cpf">CPF</SelectItem>
                    <SelectItem value="email">E-mail</SelectItem>
                    <SelectItem value="telefone">Telefone</SelectItem>
                    <SelectItem value="aleatoria">Aleatória</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Banco</Label>
                <Input
                  value={edit.banco ?? ""}
                  onChange={(e) => setEdit({ ...edit, banco: e.target.value })}
                />
              </div>
              <div>
                <Label>Agência</Label>
                <Input
                  value={edit.agencia ?? ""}
                  onChange={(e) =>
                    setEdit({ ...edit, agencia: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Conta</Label>
                <Input
                  value={edit.conta ?? ""}
                  onChange={(e) => setEdit({ ...edit, conta: e.target.value })}
                />
              </div>
              <div>
                <Label>% Adiantamento padrão</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step="0.5"
                  value={edit.percentual_adiantamento_padrao ?? 50}
                  onChange={(e) =>
                    setEdit({
                      ...edit,
                      percentual_adiantamento_padrao: Number(
                        e.target.value || 0,
                      ),
                    })
                  }
                />
              </div>
              <div className="flex items-center gap-2 md:mt-7">
                <Checkbox
                  id="ativo"
                  checked={edit.ativo ?? true}
                  onCheckedChange={(c) =>
                    setEdit({ ...edit, ativo: c === true })
                  }
                />
                <Label htmlFor="ativo" className="cursor-pointer">
                  Ativa
                </Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEdit(null)}>
              Cancelar
            </Button>
            <Button
              onClick={save}
              disabled={upsert.isPending || !edit?.nome?.trim()}
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmação de exclusão */}
      <AlertDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover transportadora?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita.{" "}
              <strong>{toDelete?.nome}</strong> será removida do cadastro.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (toDelete) del.mutate(toDelete.id);
                setToDelete(null);
              }}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
