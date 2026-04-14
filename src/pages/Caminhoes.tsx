import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { useCaminhoes, useCreateCaminhao, useUpdateCaminhao, useDeleteCaminhao, type Caminhao } from "@/hooks/useCaminhoes";
import { useTiposCaminhao } from "@/hooks/useTiposCaminhao";
import { useMotoristas } from "@/hooks/useMotoristas";
import { MotoristaAutocomplete } from "@/components/portaria/MotoristaAutocomplete";
import { DeleteConfirmDialog } from "@/components/dashboard/DeleteConfirmDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Search, Pencil, Trash2, Truck } from "lucide-react";
import { maskCPF, maskPhone } from "@/lib/masks";
import { useIsMobile } from "@/hooks/use-mobile";

function CaminhaoFormDialog({
  open,
  onOpenChange,
  caminhao,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  caminhao?: Caminhao | null;
}) {
  const [placa, setPlaca] = useState("");
  const [renavam, setRenavam] = useState("");
  const [tipoCaminhao, setTipoCaminhao] = useState("");
  const [transportadora, setTransportadora] = useState("");
  const [motoristaNome, setMotoristaNome] = useState("");
  const [motoristaId, setMotoristaId] = useState<string | null>(null);

  // Reset fields when dialog opens
  useEffect(() => {
    if (open) {
      setPlaca(caminhao?.placa ?? "");
      setRenavam(caminhao?.renavam ?? "");
      setTipoCaminhao(caminhao?.tipo_caminhao ?? "");
      setTransportadora(caminhao?.transportadora ?? "");
      setMotoristaNome(caminhao?.motorista?.nome_completo ?? "");
      setMotoristaId(caminhao?.motorista_id ?? null);
    }
  }, [open, caminhao]);

  const { data: tipos = [] } = useTiposCaminhao();
  const createMut = useCreateCaminhao();
  const updateMut = useUpdateCaminhao();
  const saving = createMut.isPending || updateMut.isPending;

  const handleSubmit = async () => {
    if (!placa.trim()) return;
    const payload = {
      placa: placa.toUpperCase().trim(),
      renavam: renavam.trim() || undefined,
      tipo_caminhao: tipoCaminhao || undefined,
      transportadora: transportadora.trim() || undefined,
      motorista_id: motoristaId,
    };
    if (caminhao) {
      await updateMut.mutateAsync({ id: caminhao.id, ...payload });
    } else {
      await createMut.mutateAsync(payload);
    }
    onOpenChange(false);
  };

  // We need to find motorista by name to get the id
  const { data: motoristasSearch = [] } = useMotoristas(motoristaNome);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{caminhao ? "Editar Caminhão" : "Novo Caminhão"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Placa *</Label>
            <Input value={placa} onChange={(e) => setPlaca(e.target.value.toUpperCase())} placeholder="ABC1D23" />
          </div>
          <div className="space-y-2">
            <Label>RENAVAM</Label>
            <Input value={renavam} onChange={(e) => setRenavam(e.target.value)} placeholder="00000000000" />
          </div>
          <div className="space-y-2">
            <Label>Tipo de Caminhão</Label>
            <Select value={tipoCaminhao} onValueChange={setTipoCaminhao}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {tipos.map((t) => <SelectItem key={t.id} value={t.nome_tipo}>{t.nome_tipo}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Transportadora</Label>
            <Input value={transportadora} onChange={(e) => setTransportadora(e.target.value)} placeholder="Nome da transportadora" />
          </div>
          <div className="space-y-2">
            <Label>Motorista Vinculado</Label>
            <MotoristaAutocomplete
              value={motoristaNome}
              onChange={(name) => {
                setMotoristaNome(name);
                // Clear motorista_id if name changes manually
                setMotoristaId(null);
              }}
              onSelect={(m) => {
                setMotoristaNome(m.nome_completo);
                // Find the id from the search results
                const found = motoristasSearch.find((mot) => mot.nome_completo === m.nome_completo);
                setMotoristaId(found?.id ?? null);
              }}
            />
          </div>
        </div>
        <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={saving || !placa.trim()}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function Caminhoes() {
  const [search, setSearch] = useState("");
  const { data: caminhoes = [], isLoading } = useCaminhoes(search);
  const deleteMut = useDeleteCaminhao();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Caminhao | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const isMobile = useIsMobile();

  return (
    <Layout>
      <div className="p-4 md:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">Caminhões</h1>
            <p className="text-sm text-muted-foreground">Cadastro de veículos com vínculo a motorista</p>
          </div>
          <Button size="sm" onClick={() => { setEditing(null); setFormOpen(true); }} className="w-full sm:w-auto text-xs sm:text-sm">
            <Plus className="h-4 w-4 mr-1" /> Novo Caminhão
          </Button>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por placa..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>

        {isMobile ? (
          <div className="space-y-3 max-w-full">
            {isLoading ? (
              <p className="text-center py-8 text-muted-foreground text-sm">Carregando...</p>
            ) : caminhoes.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
                <Truck className="h-8 w-8 opacity-40" />
                <span className="text-sm">Nenhum caminhão encontrado</span>
              </div>
            ) : caminhoes.map((c) => (
              <Card key={c.id}>
                <CardContent className="p-3 space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-bold">{c.placa}</p>
                       {c.tipo_caminhao && <p className="text-xs text-muted-foreground">Tipo: {c.tipo_caminhao}</p>}
                       {c.transportadora && <p className="text-xs text-muted-foreground">Transp: {c.transportadora}</p>}
                      {c.renavam && <p className="text-xs text-muted-foreground">RENAVAM: {c.renavam}</p>}
                      {c.motorista && (
                        <p className="text-xs text-muted-foreground">
                          Motorista: {c.motorista.nome_completo}
                          {c.motorista.telefone && ` • ${maskPhone(c.motorista.telefone)}`}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditing(c); setFormOpen(true); }}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setDeleteTarget(c.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-border bg-card overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                   <TableHead>Placa</TableHead>
                   <TableHead>RENAVAM</TableHead>
                   <TableHead>Tipo</TableHead>
                   <TableHead>Transportadora</TableHead>
                   <TableHead>Motorista</TableHead>
                   <TableHead>Telefone</TableHead>
                   <TableHead>CPF</TableHead>
                  <TableHead className="w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                 {isLoading ? (
                   <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
                 ) : caminhoes.length === 0 ? (
                   <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                     <div className="flex flex-col items-center gap-2"><Truck className="h-8 w-8 text-muted-foreground/40" /><span>Nenhum caminhão encontrado</span></div>
                  </TableCell></TableRow>
                ) : caminhoes.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-bold">{c.placa}</TableCell>
                    <TableCell>{c.renavam || "—"}</TableCell>
                     <TableCell>{c.tipo_caminhao || "—"}</TableCell>
                     <TableCell>{c.transportadora || "—"}</TableCell>
                    <TableCell>{c.motorista?.nome_completo || "—"}</TableCell>
                    <TableCell>{c.motorista?.telefone ? maskPhone(c.motorista.telefone) : "—"}</TableCell>
                    <TableCell>{c.motorista?.cpf ? maskCPF(c.motorista.cpf) : "—"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => { setEditing(c); setFormOpen(true); }}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => setDeleteTarget(c.id)}>
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

      <CaminhaoFormDialog
        key={editing?.id ?? "new"}
        open={formOpen}
        onOpenChange={setFormOpen}
        caminhao={editing}
      />

      <DeleteConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        onConfirm={() => { if (deleteTarget) { deleteMut.mutate(deleteTarget); setDeleteTarget(null); } }}
        title="Excluir caminhão"
        description="Tem certeza que deseja excluir este caminhão? Esta ação não pode ser desfeita."
      />
    </Layout>
  );
}
