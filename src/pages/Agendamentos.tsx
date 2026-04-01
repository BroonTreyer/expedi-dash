import { useState, useMemo } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus, Trash2, Edit, ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react";
import { useAgendamentos, useCreateAgendamento, useUpdateAgendamento, useDeleteAgendamento, type Agendamento } from "@/hooks/useAgendamentos";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const DOCAS = ["Doca 1", "Doca 2", "Doca 3", "Doca 4"];
const HOURS = Array.from({ length: 15 }, (_, i) => i + 6); // 06:00 - 20:00
const STATUS_COLORS: Record<string, string> = {
  agendado: "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/40 dark:text-blue-300",
  em_andamento: "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/40 dark:text-amber-300",
  concluido: "bg-green-100 text-green-700 border-green-300 dark:bg-green-900/40 dark:text-green-300",
  cancelado: "bg-red-100 text-red-500 border-red-300 dark:bg-red-900/40 dark:text-red-400",
};
const STATUS_LABELS: Record<string, string> = {
  agendado: "Agendado",
  em_andamento: "Em andamento",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

function timeToMinutes(time: string) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + (m || 0);
}

function detectOverlaps(agendamentos: Agendamento[]) {
  const overlaps = new Set<string>();
  for (let i = 0; i < agendamentos.length; i++) {
    for (let j = i + 1; j < agendamentos.length; j++) {
      const a = agendamentos[i], b = agendamentos[j];
      if (a.doca !== b.doca) continue;
      const aStart = timeToMinutes(a.horario_inicio), aEnd = timeToMinutes(a.horario_fim);
      const bStart = timeToMinutes(b.horario_inicio), bEnd = timeToMinutes(b.horario_fim);
      if (aStart < bEnd && bStart < aEnd) {
        overlaps.add(a.id);
        overlaps.add(b.id);
      }
    }
  }
  return overlaps;
}

interface FormState {
  doca: string;
  horario_inicio: string;
  horario_fim: string;
  carga_id: string;
  nome_carga: string;
  placa: string;
  motorista: string;
  transportadora: string;
  status: string;
  observacoes: string;
}

const emptyForm: FormState = {
  doca: "Doca 1", horario_inicio: "08:00", horario_fim: "09:30",
  carga_id: "", nome_carga: "", placa: "", motorista: "",
  transportadora: "", status: "agendado", observacoes: "",
};

export default function Agendamentos() {
  const { role, user } = useAuth();
  const canEdit = role === "admin" || role === "logistica";
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);
  const { data: agendamentos = [], isLoading } = useAgendamentos(selectedDate);
  const createMut = useCreateAgendamento();
  const updateMut = useUpdateAgendamento();
  const deleteMut = useDeleteAgendamento();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  const overlaps = useMemo(() => detectOverlaps(agendamentos), [agendamentos]);

  const navigateDate = (dir: number) => {
    const d = new Date(selectedDate + "T12:00:00");
    d.setDate(d.getDate() + dir);
    setSelectedDate(d.toISOString().split("T")[0]);
  };

  const openNew = (doca?: string, hour?: number) => {
    setEditingId(null);
    setForm({
      ...emptyForm,
      doca: doca || "Doca 1",
      horario_inicio: hour ? `${String(hour).padStart(2, "0")}:00` : "08:00",
      horario_fim: hour ? `${String(hour + 1).padStart(2, "0")}:30` : "09:30",
    });
    setDialogOpen(true);
  };

  const openEdit = (a: Agendamento) => {
    setEditingId(a.id);
    setForm({
      doca: a.doca,
      horario_inicio: a.horario_inicio.slice(0, 5),
      horario_fim: a.horario_fim.slice(0, 5),
      carga_id: a.carga_id || "",
      nome_carga: a.nome_carga || "",
      placa: a.placa || "",
      motorista: a.motorista || "",
      transportadora: a.transportadora || "",
      status: a.status,
      observacoes: a.observacoes || "",
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    const payload = {
      ...form,
      data: selectedDate,
      carga_id: form.carga_id || null,
      nome_carga: form.nome_carga || null,
      placa: form.placa || null,
      motorista: form.motorista || null,
      transportadora: form.transportadora || null,
      observacoes: form.observacoes || null,
      criado_por: user?.id || null,
    };
    if (editingId) {
      updateMut.mutate({ id: editingId, ...payload }, { onSuccess: () => setDialogOpen(false) });
    } else {
      createMut.mutate(payload, { onSuccess: () => setDialogOpen(false) });
    }
  };

  // Gantt grid
  const startHour = 6;
  const totalHours = 15; // 6 to 21
  const pixelsPerHour = 80;

  return (
    <Layout>
      <div className="p-4 sm:p-6 space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Agendamento de Docas</h1>
            <p className="text-sm text-muted-foreground">Gerencie slots de carregamento por doca</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navigateDate(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-40 h-8 text-sm"
            />
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navigateDate(1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            {canEdit && (
              <Button size="sm" className="h-8" onClick={() => openNew()}>
                <Plus className="h-4 w-4 mr-1" /> Agendar
              </Button>
            )}
          </div>
        </div>

        {/* Summary badges */}
        <div className="flex gap-2 flex-wrap">
          <Badge variant="outline" className="text-xs">
            {agendamentos.length} agendamento{agendamentos.length !== 1 ? "s" : ""}
          </Badge>
          {overlaps.size > 0 && (
            <Badge variant="destructive" className="text-xs gap-1">
              <AlertTriangle className="h-3 w-3" /> {overlaps.size / 2} sobreposição(ões)
            </Badge>
          )}
        </div>

        {/* Gantt Chart */}
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <TooltipProvider delayDuration={200}>
              <div className="min-w-[900px]">
                {/* Time header */}
                <div className="flex border-b border-border">
                  <div className="w-24 shrink-0 p-2 text-xs font-medium text-muted-foreground border-r border-border">Doca</div>
                  <div className="flex-1 flex relative">
                    {HOURS.map((h) => (
                      <div
                        key={h}
                        className="text-[10px] text-muted-foreground border-r border-border/40 text-center"
                        style={{ width: pixelsPerHour, minWidth: pixelsPerHour }}
                      >
                        {String(h).padStart(2, "0")}:00
                      </div>
                    ))}
                  </div>
                </div>

                {/* Doca rows */}
                {DOCAS.map((doca) => {
                  const docaItems = agendamentos.filter((a) => a.doca === doca);
                  return (
                    <div key={doca} className="flex border-b border-border/60 hover:bg-muted/20 transition-colors" style={{ minHeight: 56 }}>
                      <div className="w-24 shrink-0 p-2 text-xs font-medium border-r border-border flex items-center">{doca}</div>
                      <div
                        className="flex-1 relative cursor-pointer"
                        style={{ width: totalHours * pixelsPerHour }}
                        onClick={(e) => {
                          if (!canEdit) return;
                          const rect = e.currentTarget.getBoundingClientRect();
                          const x = e.clientX - rect.left;
                          const hour = Math.floor(x / pixelsPerHour) + startHour;
                          openNew(doca, hour);
                        }}
                      >
                        {/* Hour gridlines */}
                        {HOURS.map((h) => (
                          <div
                            key={h}
                            className="absolute top-0 bottom-0 border-r border-border/20"
                            style={{ left: (h - startHour) * pixelsPerHour }}
                          />
                        ))}

                        {/* Agendamento blocks */}
                        {docaItems.map((a) => {
                          const startMin = timeToMinutes(a.horario_inicio.slice(0, 5));
                          const endMin = timeToMinutes(a.horario_fim.slice(0, 5));
                          const left = ((startMin - startHour * 60) / 60) * pixelsPerHour;
                          const width = ((endMin - startMin) / 60) * pixelsPerHour;
                          const isOverlap = overlaps.has(a.id);
                          const colorClass = STATUS_COLORS[a.status] || STATUS_COLORS.agendado;

                          return (
                            <Tooltip key={a.id}>
                              <TooltipTrigger asChild>
                                <div
                                  className={cn(
                                    "absolute top-1 bottom-1 rounded-md border px-1.5 flex items-center gap-1 cursor-pointer transition-all hover:shadow-md text-[10px] font-medium overflow-hidden",
                                    colorClass,
                                    isOverlap && "ring-2 ring-destructive ring-offset-1"
                                  )}
                                  style={{ left: Math.max(left, 0), width: Math.max(width, 30) }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (canEdit) openEdit(a);
                                  }}
                                >
                                  {isOverlap && <AlertTriangle className="h-3 w-3 shrink-0" />}
                                  <span className="truncate">{a.nome_carga || a.placa || "Sem info"}</span>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="text-xs max-w-60">
                                <p className="font-semibold">{a.nome_carga || "Sem nome"}</p>
                                <p>Placa: {a.placa || "—"} | Motorista: {a.motorista || "—"}</p>
                                <p>{a.horario_inicio.slice(0, 5)} – {a.horario_fim.slice(0, 5)}</p>
                                <p>Status: {STATUS_LABELS[a.status]}</p>
                                {isOverlap && <p className="text-destructive font-medium mt-1">⚠ Sobreposição detectada!</p>}
                              </TooltipContent>
                            </Tooltip>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </TooltipProvider>
          </CardContent>
        </Card>

        {/* List view for mobile */}
        <div className="lg:hidden space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">Lista de Agendamentos</h2>
          {agendamentos.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhum agendamento para esta data</p>
          )}
          {agendamentos.map((a) => (
            <Card key={a.id} className={cn("border", overlaps.has(a.id) && "border-destructive")}>
              <CardContent className="p-3 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">{a.doca}</Badge>
                    <span className="text-xs font-medium">{a.horario_inicio.slice(0, 5)} – {a.horario_fim.slice(0, 5)}</span>
                    <Badge className={cn("text-[10px]", STATUS_COLORS[a.status])}>{STATUS_LABELS[a.status]}</Badge>
                  </div>
                  <p className="text-sm mt-1">{a.nome_carga || a.placa || "Sem info"}</p>
                  {a.motorista && <p className="text-xs text-muted-foreground">{a.motorista}</p>}
                </div>
                {canEdit && (
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(a)}>
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteMut.mutate(a.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Agendamento" : "Novo Agendamento"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Doca</Label>
                <Select value={form.doca} onValueChange={(v) => setForm((f) => ({ ...f, doca: v }))}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DOCAS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Início</Label>
                <Input type="time" value={form.horario_inicio} onChange={(e) => setForm((f) => ({ ...f, horario_inicio: e.target.value }))} className="h-9" />
              </div>
              <div>
                <Label className="text-xs">Fim</Label>
                <Input type="time" value={form.horario_fim} onChange={(e) => setForm((f) => ({ ...f, horario_fim: e.target.value }))} className="h-9" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Nome da Carga</Label>
              <Input value={form.nome_carga} onChange={(e) => setForm((f) => ({ ...f, nome_carga: e.target.value }))} className="h-9" placeholder="Ex: Carga SP-01" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Placa</Label>
                <Input value={form.placa} onChange={(e) => setForm((f) => ({ ...f, placa: e.target.value.toUpperCase() }))} className="h-9" placeholder="ABC1D23" />
              </div>
              <div>
                <Label className="text-xs">Motorista</Label>
                <Input value={form.motorista} onChange={(e) => setForm((f) => ({ ...f, motorista: e.target.value }))} className="h-9" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Transportadora</Label>
              <Input value={form.transportadora} onChange={(e) => setForm((f) => ({ ...f, transportadora: e.target.value }))} className="h-9" />
            </div>
            <div>
              <Label className="text-xs">Observações</Label>
              <Textarea value={form.observacoes} onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))} rows={2} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            {editingId && (
              <Button variant="destructive" size="sm" onClick={() => { deleteMut.mutate(editingId); setDialogOpen(false); }}>
                <Trash2 className="h-3.5 w-3.5 mr-1" /> Excluir
              </Button>
            )}
            <Button onClick={handleSave} disabled={createMut.isPending || updateMut.isPending}>
              {editingId ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
