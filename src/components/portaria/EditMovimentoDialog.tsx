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

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  movimento: MovimentacaoPortaria | null;
}

const EDITABLE_FIELDS: { key: string; label: string; type: "text" | "number" | "textarea" | "select"; options?: string[] }[] = [
  { key: "placa", label: "Placa", type: "text" },
  { key: "motorista", label: "Motorista", type: "text" },
  { key: "empresa", label: "Empresa", type: "text" },
  { key: "categoria", label: "Categoria", type: "select", options: ["carga_propria", "terceirizado", "fornecedor", "visitante", "prestador", "outros"] },
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
  { key: "etapa_carga_propria", label: "Etapa Carga Própria", type: "select", options: ["em_rota", "retornou", "finalizado"] },
  { key: "observacoes", label: "Observações", type: "textarea" },
  { key: "ocorrencia", label: "Ocorrência", type: "textarea" },
];

export function EditMovimentoDialog({ open, onOpenChange, movimento }: Props) {
  const updateMov = useUpdateMovimentacao();
  const { data: tiposCaminhao = [] } = useTiposCaminhao();
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
      } else if (f.type === "select") {
        updates[f.key] = val || null;
      } else {
        updates[f.key] = val?.trim() || null;
      }
    });

    // Only recalculate km_rodado if both values are in the same record
    // For retorno records, km_inicial lives on the entrada — don't produce wrong values
    if (updates.km_final != null && updates.km_inicial != null) {
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
                <Select value={values[f.key] ?? ""} onValueChange={(v) => setValues((prev) => ({ ...prev, [f.key]: v }))}>
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
