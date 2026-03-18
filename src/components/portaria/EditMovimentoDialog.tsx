import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useUpdateMovimentacao, type MovimentacaoPortaria } from "@/hooks/useMovimentacoesPortaria";
import { Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  movimento: MovimentacaoPortaria | null;
}

const EDITABLE_FIELDS: { key: keyof MovimentacaoPortaria; label: string; type: "text" | "number" | "textarea" }[] = [
  { key: "placa", label: "Placa", type: "text" },
  { key: "motorista", label: "Motorista", type: "text" },
  { key: "empresa", label: "Empresa", type: "text" },
  { key: "nome_completo", label: "Nome Completo", type: "text" },
  { key: "documento", label: "Documento", type: "text" },
  { key: "telefone", label: "Telefone", type: "text" },
  { key: "carga_id", label: "Carga ID", type: "text" },
  { key: "rota", label: "Rota", type: "text" },
  { key: "apelido", label: "Apelido", type: "text" },
  { key: "km_inicial", label: "KM Inicial", type: "number" },
  { key: "km_final", label: "KM Final", type: "number" },
  { key: "km_rota", label: "KM Rota", type: "number" },
  { key: "peso", label: "Peso (kg)", type: "number" },
  { key: "qtd_entregas", label: "Qtd Entregas", type: "number" },
  { key: "nota_fiscal", label: "Nota Fiscal", type: "text" },
  { key: "conferente", label: "Conferente", type: "text" },
  { key: "responsavel_interno", label: "Responsável Interno", type: "text" },
  { key: "doca_setor", label: "Doca/Setor", type: "text" },
  { key: "observacoes", label: "Observações", type: "textarea" },
  { key: "ocorrencia", label: "Ocorrência", type: "textarea" },
];

export function EditMovimentoDialog({ open, onOpenChange, movimento }: Props) {
  const updateMov = useUpdateMovimentacao();
  const [values, setValues] = useState<Record<string, any>>({});

  useEffect(() => {
    if (open && movimento) {
      const initial: Record<string, any> = {};
      EDITABLE_FIELDS.forEach((f) => {
        initial[f.key] = movimento[f.key] ?? "";
      });
      setValues(initial);
    }
  }, [open, movimento]);

  if (!movimento) return null;

  const handleSave = async () => {
    const updates: Record<string, any> = {};
    EDITABLE_FIELDS.forEach((f) => {
      const val = values[f.key];
      if (f.type === "number") {
        updates[f.key] = val !== "" && val !== undefined ? Number(val) : null;
      } else {
        updates[f.key] = val?.trim() || null;
      }
    });

    // Recalculate km_rodado
    if (updates.km_final && updates.km_inicial) {
      updates.km_rodado = Number(updates.km_final) - Number(updates.km_inicial);
    }

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
  const allFields = [
    ...EDITABLE_FIELDS.filter((f) => coreKeys.includes(f.key)),
    ...visibleFields.filter((f) => !coreKeys.includes(f.key)),
  ];
  // Deduplicate
  const seen = new Set<string>();
  const finalFields = allFields.filter((f) => {
    if (seen.has(f.key)) return false;
    seen.add(f.key);
    return true;
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Movimento</DialogTitle>
          <DialogDescription>Altere os dados do registro</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {finalFields.map((f) => (
            <div key={f.key} className="space-y-1">
              <Label className="text-xs">{f.label}</Label>
              {f.type === "textarea" ? (
                <Textarea
                  value={values[f.key] ?? ""}
                  onChange={(e) => setValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
                  rows={2}
                />
              ) : (
                <Input
                  type={f.type === "number" ? "number" : "text"}
                  value={values[f.key] ?? ""}
                  onChange={(e) => setValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
                />
              )}
            </div>
          ))}
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
