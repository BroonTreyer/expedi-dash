import { useState } from "react";
import { Layout } from "@/components/Layout";
import { useMotoristas, useCreateMotorista, useUpdateMotorista, useDeleteMotorista, Motorista } from "@/hooks/useMotoristas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { CapturaFoto } from "@/components/portaria/CapturaFoto";
import { Plus, Search, Pencil, Trash2, Eye } from "lucide-react";
import { format } from "date-fns";
import { PhotoViewerDialog } from "@/components/portaria/PhotoViewerDialog";

function MotoristaFormDialog({
  open,
  onOpenChange,
  motorista,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  motorista?: Motorista | null;
}) {
  const [nome, setNome] = useState(motorista?.nome_completo ?? "");
  const [cpf, setCpf] = useState(motorista?.cpf ?? "");
  const [telefone, setTelefone] = useState(motorista?.telefone ?? "");
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const createMut = useCreateMotorista();
  const updateMut = useUpdateMotorista();
  const saving = createMut.isPending || updateMut.isPending;

  const handleSubmit = async () => {
    if (!nome.trim()) return;
    if (motorista) {
      await updateMut.mutateAsync({ id: motorista.id, nome_completo: nome.trim(), cpf: cpf.trim(), telefone: telefone.trim(), fotoFile: fotoFile ?? undefined });
    } else {
      await createMut.mutateAsync({ nome_completo: nome.trim(), cpf: cpf.trim(), telefone: telefone.trim(), fotoFile: fotoFile ?? undefined });
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{motorista ? "Editar Motorista" : "Novo Motorista"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Nome Completo *</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome completo do motorista" />
          </div>
          <div className="space-y-2">
            <Label>CPF</Label>
            <Input value={cpf} onChange={(e) => setCpf(e.target.value)} placeholder="000.000.000-00" />
          </div>
          <div className="space-y-2">
            <Label>Telefone</Label>
            <Input value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(00) 00000-0000" />
          </div>
          <CapturaFoto
            label="Foto do Documento"
            onCapture={(f) => setFotoFile(f)}
            previewUrl={motorista?.foto_documento_url}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={saving || !nome.trim()}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function Motoristas() {
  const [search, setSearch] = useState("");
  const { data: motoristas = [], isLoading } = useMotoristas(search);
  const deleteMut = useDeleteMotorista();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Motorista | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Motoristas</h1>
            <p className="text-sm text-muted-foreground">Cadastro e consulta de motoristas</p>
          </div>
          <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" /> Novo Motorista
          </Button>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>CPF</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Documento</TableHead>
                <TableHead>Cadastro</TableHead>
                <TableHead className="w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : motoristas.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhum motorista encontrado</TableCell></TableRow>
              ) : (
                motoristas.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">{m.nome_completo}</TableCell>
                    <TableCell>{m.telefone || "—"}</TableCell>
                    <TableCell>
                      {m.foto_documento_url ? (
                        <Button size="sm" variant="ghost" onClick={() => setPhotoUrl(m.foto_documento_url)}>
                          <Eye className="h-4 w-4 mr-1" /> Ver
                        </Button>
                      ) : "—"}
                    </TableCell>
                    <TableCell>{format(new Date(m.created_at), "dd/MM/yyyy")}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => { setEditing(m); setFormOpen(true); }}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => deleteMut.mutate(m.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <MotoristaFormDialog
        key={editing?.id ?? "new"}
        open={formOpen}
        onOpenChange={setFormOpen}
        motorista={editing}
      />

      <PhotoViewerDialog
        open={!!photoUrl}
        onOpenChange={() => setPhotoUrl(null)}
        url={photoUrl ?? ""}
      />
    </Layout>
  );
}
