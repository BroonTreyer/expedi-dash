import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { CapturaFoto } from "./CapturaFoto";
import { OcrResultado } from "./OcrResultado";
import { PlacaInput } from "./PlacaInput";
import {
  useCreateMovimentacao,
  uploadFotoMovimentacao,
  CATEGORIAS,
  SETORES,
  type MovimentacaoPortaria,
} from "@/hooks/useMovimentacoesPortaria";
import { processarOCR } from "@/hooks/useRegistrosPortaria";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, ArrowDownToLine, ArrowUpFromLine, ChevronDown } from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  prefill?: MovimentacaoPortaria | null;
}

const INITIAL_STATE = {
  tipo: "entrada" as "entrada" | "saida",
  categoria: "carga_propria",
  placa: "",
  motorista: "",
  empresa: "",
  destinoSetor: "",
  cargaId: "",
  observacoes: "",
  fotoPlacaPreview: null as string | null,
  ocrLoading: false,
  textoPlacaLido: null as string | null,
  confiancaPlaca: null as number | null,
  placaConfirmada: "",
  fotoDocPreview: null as string | null,
};

export function RegistroMovimentoDialog({ open, onOpenChange, prefill }: Props) {
  const { user } = useAuth();
  const createMov = useCreateMovimentacao();
  const [state, setState] = useState(INITIAL_STATE);
  const [saving, setSaving] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const set = useCallback(<K extends keyof typeof INITIAL_STATE>(key: K, val: typeof INITIAL_STATE[K]) => {
    setState((s) => ({ ...s, [key]: val }));
  }, []);

  // Sync prefill when it changes
  useEffect(() => {
    if (prefill) {
      setState({
        ...INITIAL_STATE,
        tipo: "saida",
        categoria: prefill.categoria || "carga_propria",
        placa: prefill.placa || "",
        motorista: prefill.motorista || "",
        empresa: prefill.empresa || "",
        destinoSetor: prefill.destino_setor || "",
        cargaId: prefill.carga_id || "",
        observacoes: "",
        placaConfirmada: prefill.placa || "",
        fotoPlacaPreview: null,
        ocrLoading: false,
        textoPlacaLido: null,
        confiancaPlaca: null,
        fotoDocPreview: null,
      });
    } else {
      setState(INITIAL_STATE);
    }
  }, [prefill, open]);

  const handleFotoPlaca = async (file: File) => {
    set("ocrLoading", true);
    try {
      const publicUrl = await uploadFotoMovimentacao(file, "placa");
      set("fotoPlacaPreview", publicUrl);
      const result = await processarOCR(publicUrl, "placa");
      setState((s) => ({
        ...s,
        textoPlacaLido: result.texto,
        confiancaPlaca: result.confianca,
        placaConfirmada: result.texto,
        placa: result.texto,
        ocrLoading: false,
      }));
    } catch (e: any) {
      toast.error("Erro no OCR da placa: " + e.message);
      set("ocrLoading", false);
    }
  };

  const handleFotoDoc = async (file: File) => {
    try {
      const publicUrl = await uploadFotoMovimentacao(file, "doc");
      set("fotoDocPreview", publicUrl);
    } catch (e: any) {
      toast.error("Erro ao enviar foto: " + e.message);
    }
  };

  const canSave = state.placa.trim().length >= 3 && !state.ocrLoading && !!state.fotoPlacaPreview && !!state.fotoDocPreview;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      await createMov.mutateAsync({
        tipo_movimento: state.tipo,
        categoria: state.categoria,
        placa: state.placa.trim().toUpperCase(),
        motorista: state.motorista.trim() || null,
        empresa: state.empresa.trim() || null,
        destino_setor: state.destinoSetor || null,
        motivo: state.motivo.trim() || null,
        carga_id: state.cargaId.trim() || null,
        foto_placa_url: state.fotoPlacaPreview || null,
        texto_placa_lido: state.textoPlacaLido || null,
        confianca_placa: state.confiancaPlaca,
        placa_confirmada: state.placaConfirmada || state.placa.trim().toUpperCase(),
        foto_documento_url: state.fotoDocPreview || null,
        observacoes: state.observacoes.trim() || null,
        usuario_id: user?.id ?? null,
        movimento_vinculado_id: prefill?.id || null,
      });
      onOpenChange(false);
      setState(INITIAL_STATE);
    } catch {
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setState(INITIAL_STATE);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); else onOpenChange(v); }}>
      <DialogContent className="max-w-lg w-[calc(100vw-2rem)] sm:w-full max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar Movimento</DialogTitle>
          <DialogDescription>
            {prefill ? `Registrar saída do veículo ${prefill.placa}` : "Registre entrada ou saída de veículo"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Step 1: Essencial */}
          {!prefill && (
            <div className="space-y-1.5">
              <Label>Tipo de Movimento</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={state.tipo === "entrada" ? "default" : "outline"}
                  className="gap-2"
                  onClick={() => set("tipo", "entrada")}
                >
                  <ArrowDownToLine className="h-4 w-4" /> Entrada
                </Button>
                <Button
                  type="button"
                  variant={state.tipo === "saida" ? "default" : "outline"}
                  className="gap-2"
                  onClick={() => set("tipo", "saida")}
                >
                  <ArrowUpFromLine className="h-4 w-4" /> Saída
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Categoria</Label>
            <Select value={state.categoria} onValueChange={(v) => set("categoria", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIAS.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <PlacaInput
            value={state.placa}
            onChange={(v) => set("placa", v)}
            onAutofill={(d) => {
              setState((s) => ({
                ...s,
                motorista: d.motorista || s.motorista,
                empresa: d.empresa || s.empresa,
                categoria: d.categoria || s.categoria,
                destinoSetor: d.destino_setor || s.destinoSetor,
              }));
              if (d.motorista || d.empresa) setDetailsOpen(true);
            }}
            disabled={saving || !!prefill}
          />

          {/* Step 2: Detalhes opcionais (colapsível) */}
          <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between text-sm text-muted-foreground hover:text-foreground gap-2 h-8 px-2">
                Adicionar mais detalhes
                <ChevronDown className={`h-4 w-4 transition-transform ${detailsOpen ? "rotate-180" : ""}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label>Motorista</Label>
                <Input value={state.motorista} onChange={(e) => set("motorista", e.target.value)} placeholder="Nome do motorista" disabled={saving} />
              </div>

              <div className="space-y-1.5">
                <Label>Empresa / Transportadora</Label>
                <Input value={state.empresa} onChange={(e) => set("empresa", e.target.value)} placeholder="Nome da empresa" disabled={saving} />
              </div>

              <div className="space-y-1.5">
                <Label>Setor de Destino</Label>
                <Select value={state.destinoSetor} onValueChange={(v) => set("destinoSetor", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {SETORES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Motivo</Label>
                <Input value={state.motivo} onChange={(e) => set("motivo", e.target.value)} placeholder="Motivo da entrada/saída" disabled={saving} />
              </div>

              {state.categoria === "carga_propria" && (
                <div className="space-y-1.5">
                  <Label>Carga Vinculada (opcional)</Label>
                  <Input value={state.cargaId} onChange={(e) => set("cargaId", e.target.value)} placeholder="ID da carga" disabled={saving} />
                </div>
              )}

              <CapturaFoto label="📷 Foto da Placa (opcional)" onCapture={handleFotoPlaca} previewUrl={state.fotoPlacaPreview} disabled={saving} />
              {(state.ocrLoading || state.textoPlacaLido !== null) && (
                <OcrResultado
                  label="Leitura da Placa"
                  textoLido={state.textoPlacaLido}
                  confianca={state.confiancaPlaca}
                  valorConfirmado={state.placaConfirmada}
                  onChange={(v) => setState((s) => ({ ...s, placaConfirmada: v, placa: v }))}
                  loading={state.ocrLoading}
                  disabled={saving}
                />
              )}

              <CapturaFoto label="📷 Foto de Documento/NF (opcional)" onCapture={handleFotoDoc} previewUrl={state.fotoDocPreview} disabled={saving} />

              <div className="space-y-1.5">
                <Label>Observações</Label>
                <Textarea value={state.observacoes} onChange={(e) => set("observacoes", e.target.value)} placeholder="Observações adicionais..." disabled={saving} rows={2} />
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={!canSave || saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
            Registrar {state.tipo === "entrada" ? "Entrada" : "Saída"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
