import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CapturaFoto } from "./CapturaFoto";
import { OcrResultado } from "./OcrResultado";
import {
  useCreateMovimentacao,
  uploadFotoMovimentacao,
  CATEGORIAS,
  SETORES,
  type MovimentacaoPortaria,
} from "@/hooks/useMovimentacoesPortaria";
import { processarOCR } from "@/hooks/useRegistrosPortaria";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  prefill?: MovimentacaoPortaria | null; // for quick exit from pátio
}

export function RegistroMovimentoDialog({ open, onOpenChange, prefill }: Props) {
  const { user } = useAuth();
  const createMov = useCreateMovimentacao();

  const [tipo, setTipo] = useState<"entrada" | "saida">(prefill ? "saida" : "entrada");
  const [categoria, setCategoria] = useState(prefill?.categoria || "carga_propria");
  const [placa, setPlaca] = useState(prefill?.placa || "");
  const [motorista, setMotorista] = useState(prefill?.motorista || "");
  const [empresa, setEmpresa] = useState(prefill?.empresa || "");
  const [destinoSetor, setDestinoSetor] = useState(prefill?.destino_setor || "");
  const [motivo, setMotivo] = useState(prefill?.motivo || "");
  const [cargaId, setCargaId] = useState(prefill?.carga_id || "");
  const [observacoes, setObservacoes] = useState("");

  // Photo states
  const [fotoPlacaPreview, setFotoPlacaPreview] = useState<string | null>(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [textoPlacaLido, setTextoPlacaLido] = useState<string | null>(null);
  const [confiancaPlaca, setConfiancaPlaca] = useState<number | null>(null);
  const [placaConfirmada, setPlacaConfirmada] = useState(prefill?.placa || "");

  const [fotoDocPreview, setFotoDocPreview] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);

  const handleFotoPlaca = async (file: File) => {
    setOcrLoading(true);
    try {
      const publicUrl = await uploadFotoMovimentacao(file, "placa");
      setFotoPlacaPreview(publicUrl);
      const result = await processarOCR(publicUrl, "placa");
      setTextoPlacaLido(result.texto);
      setConfiancaPlaca(result.confianca);
      setPlacaConfirmada(result.texto);
      setPlaca(result.texto);
    } catch (e: any) {
      toast.error("Erro no OCR da placa: " + e.message);
    } finally {
      setOcrLoading(false);
    }
  };

  const handleFotoDoc = async (file: File) => {
    try {
      const publicUrl = await uploadFotoMovimentacao(file, "doc");
      setFotoDocPreview(publicUrl);
    } catch (e: any) {
      toast.error("Erro ao enviar foto: " + e.message);
    }
  };

  const canSave = placa.trim() && !ocrLoading;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      await createMov.mutateAsync({
        tipo_movimento: tipo,
        categoria,
        placa: placa.trim().toUpperCase(),
        motorista: motorista.trim() || null,
        empresa: empresa.trim() || null,
        destino_setor: destinoSetor || null,
        motivo: motivo.trim() || null,
        carga_id: cargaId.trim() || null,
        foto_placa_url: fotoPlacaPreview || null,
        texto_placa_lido: textoPlacaLido || null,
        confianca_placa: confiancaPlaca,
        placa_confirmada: placaConfirmada || placa.trim().toUpperCase(),
        foto_documento_url: fotoDocPreview || null,
        observacoes: observacoes.trim() || null,
        usuario_id: user?.id ?? null,
        movimento_vinculado_id: prefill?.id || null,
      });
      onOpenChange(false);
      resetForm();
    } catch {
      // handled by mutation
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setTipo("entrada");
    setCategoria("carga_propria");
    setPlaca("");
    setMotorista("");
    setEmpresa("");
    setDestinoSetor("");
    setMotivo("");
    setCargaId("");
    setObservacoes("");
    setFotoPlacaPreview(null);
    setOcrLoading(false);
    setTextoPlacaLido(null);
    setConfiancaPlaca(null);
    setPlacaConfirmada("");
    setFotoDocPreview(null);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="max-w-lg max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar Movimento</DialogTitle>
          <DialogDescription>
            {prefill ? `Registrar saída do veículo ${prefill.placa}` : "Registre entrada ou saída de veículo na portaria"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Tipo toggle */}
          {!prefill && (
            <div className="space-y-1.5">
              <Label>Tipo de Movimento</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={tipo === "entrada" ? "default" : "outline"}
                  className="gap-2"
                  onClick={() => setTipo("entrada")}
                >
                  <ArrowDownToLine className="h-4 w-4" /> Entrada
                </Button>
                <Button
                  type="button"
                  variant={tipo === "saida" ? "default" : "outline"}
                  className="gap-2"
                  onClick={() => setTipo("saida")}
                >
                  <ArrowUpFromLine className="h-4 w-4" /> Saída
                </Button>
              </div>
            </div>
          )}

          {/* Categoria */}
          <div className="space-y-1.5">
            <Label>Categoria</Label>
            <Select value={categoria} onValueChange={setCategoria}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIAS.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Placa */}
          <div className="space-y-1.5">
            <Label>Placa *</Label>
            <Input
              value={placa}
              onChange={(e) => setPlaca(e.target.value.toUpperCase())}
              placeholder="ABC-1D23"
              disabled={saving}
            />
          </div>

          {/* Motorista */}
          <div className="space-y-1.5">
            <Label>Motorista</Label>
            <Input value={motorista} onChange={(e) => setMotorista(e.target.value)} placeholder="Nome do motorista" disabled={saving} />
          </div>

          {/* Empresa */}
          <div className="space-y-1.5">
            <Label>Empresa / Transportadora</Label>
            <Input value={empresa} onChange={(e) => setEmpresa(e.target.value)} placeholder="Nome da empresa" disabled={saving} />
          </div>

          {/* Setor */}
          <div className="space-y-1.5">
            <Label>Setor de Destino</Label>
            <Select value={destinoSetor} onValueChange={setDestinoSetor}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {SETORES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Motivo */}
          <div className="space-y-1.5">
            <Label>Motivo</Label>
            <Input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Motivo da entrada/saída" disabled={saving} />
          </div>

          {/* Carga vinculada */}
          {categoria === "carga_propria" && (
            <div className="space-y-1.5">
              <Label>Carga Vinculada (opcional)</Label>
              <Input value={cargaId} onChange={(e) => setCargaId(e.target.value)} placeholder="ID da carga" disabled={saving} />
            </div>
          )}

          {/* Foto placa + OCR */}
          <CapturaFoto label="📷 Foto da Placa (opcional)" onCapture={handleFotoPlaca} previewUrl={fotoPlacaPreview} disabled={saving} />
          {(ocrLoading || textoPlacaLido !== null) && (
            <OcrResultado
              label="Leitura da Placa"
              textoLido={textoPlacaLido}
              confianca={confiancaPlaca}
              valorConfirmado={placaConfirmada}
              onChange={(v) => { setPlacaConfirmada(v); setPlaca(v); }}
              loading={ocrLoading}
              disabled={saving}
            />
          )}

          {/* Foto documento */}
          <CapturaFoto label="📷 Foto de Documento/NF (opcional)" onCapture={handleFotoDoc} previewUrl={fotoDocPreview} disabled={saving} />

          {/* Observações */}
          <div className="space-y-1.5">
            <Label>Observações</Label>
            <Textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} placeholder="Observações adicionais..." disabled={saving} rows={2} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { resetForm(); onOpenChange(false); }} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!canSave || saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
            Registrar {tipo === "entrada" ? "Entrada" : "Saída"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
