import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUpdateMovimentacao, type MovimentacaoPortaria, CATEGORIAS } from "@/hooks/useMovimentacoesPortaria";
import { useTiposCaminhao } from "@/hooks/useTiposCaminhao";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const TIME_FIELDS: { key: keyof MovimentacaoPortaria; label: string }[] = [
  { key: "horario_chegada", label: "Chegada na portaria" },
  { key: "horario_entrada", label: "Liberação para o pátio" },
  { key: "horario_real_saida", label: "Saída para rota" },
  { key: "horario_real_retorno", label: "Retorno da rota" },
  { key: "horario_saida_final", label: "Saída final" },
];

function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  try {
    return format(new Date(iso), "yyyy-MM-dd'T'HH:mm");
  } catch {
    return "";
  }
}

function fromLocalInput(local: string): string | null {
  if (!local) return null;
  const d = new Date(local);
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  movimento: MovimentacaoPortaria | null;
}

const EDITABLE_FIELDS: { key: string; label: string; type: "text" | "number" | "textarea" | "select"; options?: string[] }[] = [
  { key: "placa", label: "Placa", type: "text" },
  { key: "motorista", label: "Motorista", type: "text" },
  { key: "empresa", label: "Empresa", type: "text" },
  // A10 — categoria NÃO pode ser trocada por edição. Trocar categoria invalida
  // toda a máquina de etapas (carga_propria↔terceirizado têm campos distintos
  // de etapa e fluxo). Para mudar categoria, exclua o registro e crie de novo.
  // Mantida como display read-only no diálogo.
  { key: "tipo_movimento", label: "Tipo Movimento", type: "select", options: ["entrada", "saida"] },
  { key: "nome_completo", label: "Nome Completo", type: "text" },
  { key: "documento", label: "Documento", type: "text" },
  { key: "telefone", label: "Telefone", type: "text" },
  { key: "carga_id", label: "Carga ID", type: "text" },
  { key: "rota", label: "Rota", type: "text" },
  { key: "apelido", label: "Apelido", type: "text" },
  { key: "destino_setor", label: "Setor/Destino", type: "text" },
  { key: "km_inicial", label: "KM Inicial", type: "number" },
  { key: "km_final", label: "KM Final", type: "number" },
  { key: "km_rota", label: "KM Rota", type: "number" },
  { key: "peso", label: "Peso (kg)", type: "number" },
  { key: "qtd_entregas", label: "Qtd Entregas", type: "number" },
  { key: "nota_fiscal", label: "Nota Fiscal", type: "text" },
  { key: "conferente", label: "Conferente", type: "text" },
  { key: "responsavel_interno", label: "Responsável Interno", type: "text" },
  { key: "doca_setor", label: "Doca/Setor", type: "text" },
  { key: "tipo_caminhao", label: "Tipo de Caminhão", type: "text" },
  // D3 — `chegou` é destino válido de edição (estado inicial do ciclo CP).
  { key: "etapa_carga_propria", label: "Etapa Varejo", type: "select", options: ["chegou", "em_rota", "retornou", "finalizado"] },
  { key: "pessoa_visitada", label: "Pessoa Visitada", type: "text" },
  { key: "motivo_visita", label: "Motivo da Visita", type: "text" },
  { key: "servico_executar", label: "Serviço a Executar", type: "text" },
  { key: "descricao", label: "Descrição", type: "textarea" },
  { key: "tipo_operacao", label: "Tipo de Operação", type: "text" },
  { key: "tipo_carga", label: "Tipo de Carga", type: "text" },
  { key: "numero_lacre", label: "Nº Lacre", type: "text" },
  { key: "observacoes", label: "Observações", type: "textarea" },
  { key: "ocorrencia", label: "Ocorrência", type: "textarea" },
];

export function EditMovimentoDialog({ open, onOpenChange, movimento }: Props) {
  const updateMov = useUpdateMovimentacao();
  const { data: tiposCaminhao = [] } = useTiposCaminhao();
  const [values, setValues] = useState<Record<string, any>>({});
  const [times, setTimes] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open && movimento) {
      const initial: Record<string, any> = {};
      EDITABLE_FIELDS.forEach((f) => {
        initial[f.key] = movimento[f.key] ?? "";
      });
      setValues(initial);
      const t: Record<string, string> = {};
      TIME_FIELDS.forEach((f) => {
        t[f.key as string] = toLocalInput(movimento[f.key] as any);
      });
      setTimes(t);
    }
  }, [open, movimento]);

  if (!movimento) return null;

  const handleSave = async () => {
    // A9 — apenas campos efetivamente exibidos no formulário entram no UPDATE.
    // Antes, todos os EDITABLE_FIELDS viravam null e apagavam dados não visíveis.
    const updates: Record<string, any> = {};
    finalFields.forEach((f) => {
      const val = values[f.key];
      if (f.type === "number") {
        updates[f.key] = val !== "" && val !== undefined && val !== null ? Number(val) : null;
      } else if (f.type === "select") {
        updates[f.key] = val || null;
      } else {
        updates[f.key] = (typeof val === "string" ? val.trim() : val) || null;
      }
    });

    // A1 — validação de KM (banco também valida via trigger)
    if (updates.km_final != null && updates.km_inicial != null) {
      const kmIni = Number(updates.km_inicial);
      const kmFim = Number(updates.km_final);
      if (Number.isFinite(kmIni) && Number.isFinite(kmFim)) {
        if (kmFim < kmIni) {
          toast.error(`KM Final (${kmFim}) não pode ser menor que KM Inicial (${kmIni}).`);
          return;
        }
        if (kmFim - kmIni > 3000) {
          toast.error(`Diferença de KM (${kmFim - kmIni}) excede o limite de 3000 km.`);
          return;
        }
        updates.km_rodado = kmFim - kmIni;
      }
    }

    // Horários — só envia os que mudaram
    const timeUpdates: Record<string, string | null> = {};
    for (const f of TIME_FIELDS) {
      const original = toLocalInput(movimento[f.key] as any);
      const current = times[f.key as string] ?? "";
      if (current !== original) {
        timeUpdates[f.key as string] = fromLocalInput(current);
      }
    }

    const finalTimes: Record<string, string | null> = {
      horario_chegada: (timeUpdates.horario_chegada !== undefined ? timeUpdates.horario_chegada : (movimento.horario_chegada ?? null)) as any,
      horario_entrada: (timeUpdates.horario_entrada !== undefined ? timeUpdates.horario_entrada : (movimento.horario_entrada ?? null)) as any,
      horario_real_saida: (timeUpdates.horario_real_saida !== undefined ? timeUpdates.horario_real_saida : (movimento.horario_real_saida ?? null)) as any,
      horario_real_retorno: (timeUpdates.horario_real_retorno !== undefined ? timeUpdates.horario_real_retorno : (movimento.horario_real_retorno ?? null)) as any,
      horario_saida_final: (timeUpdates.horario_saida_final !== undefined ? timeUpdates.horario_saida_final : (movimento.horario_saida_final ?? null)) as any,
    };

    const nowMs = Date.now() + 5 * 60 * 1000;
    for (const [k, v] of Object.entries(finalTimes)) {
      if (v && new Date(v).getTime() > nowMs) {
        toast.error(`"${TIME_FIELDS.find((f) => f.key === k)?.label}" não pode estar no futuro.`);
        return;
      }
    }
    const ordered: [string, string | null | undefined, string][] = [
      ["horario_entrada", finalTimes.horario_chegada, "Liberação para o pátio precisa ser >= Chegada na portaria"],
      ["horario_real_retorno", finalTimes.horario_real_saida, "Retorno precisa ser >= Saída para rota"],
      ["horario_saida_final", finalTimes.horario_real_retorno || finalTimes.horario_entrada, "Saída final precisa ser >= Retorno / Liberação"],
    ];
    for (const [later, earlier, msg] of ordered) {
      const l = finalTimes[later as keyof typeof finalTimes];
      if (l && earlier && new Date(l).getTime() < new Date(earlier).getTime()) {
        toast.error(msg);
        return;
      }
    }
    Object.assign(updates, timeUpdates);

    await updateMov.mutateAsync({ id: movimento.id, ...updates });
    onOpenChange(false);
  };

  // Only show fields that have values or are commonly edited
  const visibleFields = EDITABLE_FIELDS.filter((f) => {
    const original = movimento[f.key];
    return original !== null && original !== undefined && original !== "";
  });

  // Always show these core fields even if empty
  const coreKeys = ["placa", "motorista", "empresa", "observacoes"];
  // Por categoria, mostrar campos relevantes mesmo se vazios para permitir preenchimento tardio
  const categoriaExtras: Record<string, string[]> = {
    visitante: ["nome_completo", "documento", "telefone", "pessoa_visitada", "motivo_visita"],
    prestador_servico: ["nome_completo", "documento", "telefone", "servico_executar"],
    outros: ["descricao"],
    terceirizado: ["numero_lacre"],
    carga_propria: ["numero_lacre"],
  };
  const extraKeys = categoriaExtras[movimento.categoria] || [];
  const allFields = [
    ...EDITABLE_FIELDS.filter((f) => coreKeys.includes(f.key)),
    ...EDITABLE_FIELDS.filter((f) => extraKeys.includes(f.key)),
    ...visibleFields.filter((f) => !coreKeys.includes(f.key)),
  ];
  // Deduplicate
  const seen = new Set<string>();
  const finalFields = allFields.filter((f) => {
    if (seen.has(f.key)) return false;
    seen.add(f.key);
    return true;
  });

  // Quais campos de horário mostrar para este movimento
  const visibleTimeFields = TIME_FIELDS.filter((f) => {
    if (movimento[f.key]) return true;
    if (movimento.categoria === "carga_propria") {
      return ["horario_chegada", "horario_entrada", "horario_real_saida", "horario_real_retorno", "horario_saida_final"].includes(f.key as string);
    }
    // terceirizado / outros
    if (movimento.tipo_movimento === "entrada") {
      return ["horario_chegada", "horario_entrada"].includes(f.key as string);
    }
    return ["horario_saida_final"].includes(f.key as string);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Movimento</DialogTitle>
          <DialogDescription>Altere os dados do registro</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Categoria (não editável)</Label>
            <Input
              value={CATEGORIAS.find((c) => c.value === movimento.categoria)?.label || movimento.categoria}
              readOnly
              disabled
            />
          </div>
          {finalFields.map((f) => (
            <div key={f.key} className="space-y-1">
              <Label className="text-xs">{f.label}</Label>
              {f.type === "textarea" ? (
                <Textarea
                  value={values[f.key] ?? ""}
                  onChange={(e) => setValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
                  rows={2}
                />
              ) : f.key === "tipo_caminhao" ? (
                <Select value={values[f.key] ?? ""} onValueChange={(v) => setValues((prev) => ({ ...prev, [f.key]: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {tiposCaminhao.map((t) => (
                      <SelectItem key={t.id} value={t.nome_tipo}>{t.nome_tipo}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : f.type === "select" ? (
                <Select value={values[f.key] ?? ""} onValueChange={(v) => {
                  setValues((prev) => {
                    const next = { ...prev, [f.key]: v };
                    return next;
                  });
                }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {f.options?.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {f.key === "categoria" ? (CATEGORIAS.find((c) => c.value === opt)?.label || opt) : opt === "entrada" ? "Entrada" : "Saída"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  type={f.type === "number" ? "number" : "text"}
                  value={values[f.key] ?? ""}
                  onChange={(e) => setValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
                />
              )}
            </div>
          ))}

          {visibleTimeFields.length > 0 && (
            <div className="pt-3 mt-2 border-t space-y-3">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Horários
              </div>
              {visibleTimeFields.map((f) => (
                <div key={f.key as string} className="space-y-1">
                  <Label className="text-xs">{f.label}</Label>
                  <Input
                    type="datetime-local"
                    value={times[f.key as string] ?? ""}
                    onChange={(e) =>
                      setTimes((prev) => ({ ...prev, [f.key as string]: e.target.value }))
                    }
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={updateMov.isPending}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={updateMov.isPending}>
            {updateMov.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
