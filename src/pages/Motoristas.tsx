import { useState } from "react";
import { Layout } from "@/components/Layout";
import { useMotoristas, useCreateMotorista, useUpdateMotorista, useDeleteMotorista, Motorista } from "@/hooks/useMotoristas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { CapturaFoto } from "@/components/portaria/CapturaFoto";
import { Plus, Search, Pencil, Trash2, Eye, User, AlertTriangle } from "lucide-react";
import { maskCPF, maskPhone } from "@/lib/masks";
import { format } from "date-fns";
import { PhotoViewerDialog } from "@/components/portaria/PhotoViewerDialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import { toast } from "sonner";

function MotoristaFormDialog({
  open,
  onOpenChange,
  motorista,
  onSwitchToExisting,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  motorista?: Motorista | null;
  onSwitchToExisting?: (m: Motorista) => void;
}) {
  const [nome, setNome] = useState(motorista?.nome_completo ?? "");
  const [cpf, setCpf] = useState(motorista?.cpf ?? "");
  const [telefone, setTelefone] = useState(motorista?.telefone ?? "");
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [duplicado, setDuplicado] = useState<Motorista | null>(null);
  const [duplicadoMotivo, setDuplicadoMotivo] = useState<"cpf" | "nome" | null>(null);
  const createMut = useCreateMotorista();
  const updateMut = useUpdateMotorista();
  const saving = createMut.isPending || updateMut.isPending;

  // Checa duplicidade ao digitar (CPF completo ou nome com >= 4 chars)
  useEffect(() => {
    if (!open) return;
    const cpfDigits = cpf.replace(/\D/g, "");
    const nomeNorm = nome.trim().toLowerCase();
    if (cpfDigits.length < 11 && nomeNorm.length < 4) {
      setDuplicado(null);
      setDuplicadoMotivo(null);
      return;
    }
    const t = setTimeout(async () => {
      let q = supabase.from("motoristas").select("*").eq("ativo", true).limit(1);
      if (cpfDigits.length === 11 && cpf.trim()) {
        q = q.eq("cpf", cpf.trim());
      } else if (nomeNorm.length >= 4) {
        q = q.ilike("nome_completo", nomeNorm);
      } else {
        return;
      }
      const { data } = await q;
      const found = (data?.[0] as unknown as Motorista | undefined) || null;
      if (found && found.id !== motorista?.id) {
        setDuplicado(found);
        setDuplicadoMotivo(cpfDigits.length === 11 ? "cpf" : "nome");
      } else {
        setDuplicado(null);
        setDuplicadoMotivo(null);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [cpf, nome, motorista?.id, open]);

  const handleSubmit = async () => {
    if (!nome.trim()) return;
    if (duplicado && !motorista) {
      toast.error(`Já existe motorista cadastrado com este ${duplicadoMotivo === "cpf" ? "CPF" : "nome"}`);
      return;
    }
    if (motorista) {
      await updateMut.mutateAsync({ id: motorista.id, nome_completo: nome.trim(), cpf: cpf.trim(), telefone: telefone.trim(), fotoFile: fotoFile ?? undefined });
    } else {
      await createMut.mutateAsync({ nome_completo: nome.trim(), cpf: cpf.trim(), telefone: telefone.trim(), fotoFile: fotoFile ?? undefined });
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
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
            <Input value={cpf} onChange={(e) => setCpf(maskCPF(e.target.value))} placeholder="000.000.000-00" />
          </div>
          <div className="space-y-2">
            <Label>Telefone</Label>
            <Input value={telefone} onChange={(e) => setTelefone(maskPhone(e.target.value))} placeholder="(00) 00000-0000" />
          </div>
          {duplicado && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm space-y-2">
              <div className="flex items-start gap-2 text-destructive">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="font-medium">Motorista já cadastrado</p>
                  <p className="text-xs opacity-90">
                    {duplicadoMotivo === "cpf" ? "Este CPF" : "Este nome"} já pertence a{" "}
                    <strong>{duplicado.nome_completo}</strong>
                    {duplicado.cpf && ` — CPF ${maskCPF(duplicado.cpf)}`}.
                  </p>
                </div>
              </div>
              {onSwitchToExisting && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => { onSwitchToExisting(duplicado); }}
                >
                  Editar cadastro existente
                </Button>
              )}
            </div>
          )}
          <CapturaFoto
            label="Foto do Documento"
            onCapture={(f) => setFotoFile(f)}
            previewUrl={motorista?.foto_documento_url}
            accept="image/*,.pdf,application/pdf"
            allowFileUpload
          />
        </div>
        <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={saving || !nome.trim() || (!!duplicado && !motorista)}>
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
  const isMobile = useIsMobile();

  return (
    <Layout>
      <div className="p-4 md:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">Motoristas</h1>
            <p className="text-sm text-muted-foreground">Cadastro e consulta de motoristas</p>
          </div>
          <Button size="sm" onClick={() => { setEditing(null); setFormOpen(true); }} className="w-full sm:w-auto text-xs sm:text-sm">
            <Plus className="h-4 w-4 mr-1" /> Novo Motorista
          </Button>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou CPF..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {isMobile ? (
          <div className="space-y-3 max-w-full">
            {isLoading ? (
              <p className="text-center py-8 text-muted-foreground text-sm">Carregando...</p>
            ) : motoristas.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
                <User className="h-8 w-8 opacity-40" />
                <span className="text-sm">Nenhum motorista encontrado</span>
              </div>
            ) : motoristas.map((m) => (
              <Card key={m.id}>
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{m.nome_completo}</p>
                      {m.cpf && <p className="text-xs text-muted-foreground">CPF: {maskCPF(m.cpf)}</p>}
                      {m.telefone && <p className="text-xs text-muted-foreground">Tel: {maskPhone(m.telefone)}</p>}
                      <p className="text-xs text-muted-foreground">Cadastro: {format(new Date(m.created_at), "dd/MM/yyyy")}</p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditing(m); setFormOpen(true); }}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => deleteMut.mutate(m.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  {m.foto_documento_url && (
                    <Button size="sm" variant="outline" className="w-full text-xs h-7" onClick={() => setPhotoUrl(m.foto_documento_url)}>
                      <Eye className="h-3.5 w-3.5 mr-1" /> Ver Documento
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-border bg-card overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
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
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
                ) : motoristas.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    <div className="flex flex-col items-center gap-2"><User className="h-8 w-8 text-muted-foreground/40" /><span>Nenhum motorista encontrado</span></div>
                  </TableCell></TableRow>
                ) : motoristas.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">{m.nome_completo}</TableCell>
                    <TableCell>{m.cpf ? maskCPF(m.cpf) : "—"}</TableCell>
                    <TableCell>{m.telefone ? maskPhone(m.telefone) : "—"}</TableCell>
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
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <MotoristaFormDialog
        key={editing?.id ?? "new"}
        open={formOpen}
        onOpenChange={setFormOpen}
        motorista={editing}
        onSwitchToExisting={(m) => { setEditing(m); }}
      />

      <PhotoViewerDialog
        open={!!photoUrl}
        onOpenChange={() => setPhotoUrl(null)}
        url={photoUrl ?? ""}
      />
    </Layout>
  );
}