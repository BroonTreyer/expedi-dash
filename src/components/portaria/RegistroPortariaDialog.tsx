import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CapturaFoto } from "./CapturaFoto";
import { OcrResultado } from "./OcrResultado";
import { uploadFotoPortaria, processarOCR, useCreateRegistroPortaria, type RegistroPortaria } from "@/hooks/useRegistrosPortaria";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tipo: "saida" | "retorno";
  cargaId: string;
  placaPrevista: string | null;
  registroSaida?: RegistroPortaria | null; // for retorno — to calculate km_rodado
}

export function RegistroPortariaDialog({ open, onOpenChange, tipo, cargaId, placaPrevista, registroSaida }: Props) {
  const { user } = useAuth();
  const createRegistro = useCreateRegistroPortaria();

  const [fotoPlaca, setFotoPlaca] = useState<File | null>(null);
  const [fotoKm, setFotoKm] = useState<File | null>(null);
  const [fotoPlacaPreview, setFotoPlacaPreview] = useState<string | null>(null);
  const [fotoKmPreview, setFotoKmPreview] = useState<string | null>(null);

  const [ocrPlacaLoading, setOcrPlacaLoading] = useState(false);
  const [ocrKmLoading, setOcrKmLoading] = useState(false);
  const [textoPlacaLido, setTextoPlacaLido] = useState<string | null>(null);
  const [confiancaPlaca, setConfiancaPlaca] = useState<number | null>(null);
  const [kmLido, setKmLido] = useState<string | null>(null);
  const [confiancaKm, setConfiancaKm] = useState<number | null>(null);

  const [placaConfirmada, setPlacaConfirmada] = useState("");
  const [kmConfirmado, setKmConfirmado] = useState("");

  const [saving, setSaving] = useState(false);

  const handleFotoPlaca = async (file: File) => {
    setFotoPlaca(file);
    const url = URL.createObjectURL(file);
    setFotoPlacaPreview(url);

    setOcrPlacaLoading(true);
    try {
      const publicUrl = await uploadFotoPortaria(file, cargaId, `placa_${tipo}`);
      setFotoPlacaPreview(publicUrl);
      const result = await processarOCR(publicUrl, "placa");
      setTextoPlacaLido(result.texto);
      setConfiancaPlaca(result.confianca);
      setPlacaConfirmada(result.texto);
    } catch (e: any) {
      toast.error("Erro no OCR da placa: " + e.message);
    } finally {
      setOcrPlacaLoading(false);
    }
  };

  const handleFotoKm = async (file: File) => {
    setFotoKm(file);
    const url = URL.createObjectURL(file);
    setFotoKmPreview(url);

    setOcrKmLoading(true);
    try {
      const publicUrl = await uploadFotoPortaria(file, cargaId, `km_${tipo}`);
      setFotoKmPreview(publicUrl);
      const result = await processarOCR(publicUrl, "km");
      setKmLido(result.texto);
      setConfiancaKm(result.confianca);
      setKmConfirmado(result.texto);
    } catch (e: any) {
      toast.error("Erro no OCR do KM: " + e.message);
    } finally {
      setOcrKmLoading(false);
    }
  };

  const alertaPlaca = (() => {
    if (!placaConfirmada || !placaPrevista) return null;
    const norm = (s: string) => s.replace(/[^A-Z0-9]/gi, "").toUpperCase();
    if (norm(placaConfirmada) !== norm(placaPrevista)) {
      return `Placa divergente! Prevista: ${placaPrevista}`;
    }
    return null;
  })();

  const alertaKm = (() => {
    if (tipo !== "retorno" || !registroSaida?.km_confirmado) return null;
    const kmFinal = Number(kmConfirmado);
    if (isNaN(kmFinal)) return null;
    if (kmFinal < registroSaida.km_confirmado) {
      return `KM final (${kmFinal}) menor que KM inicial (${registroSaida.km_confirmado}) — leitura suspeita!`;
    }
    return null;
  })();

  const canSave = fotoPlacaPreview && fotoKmPreview && placaConfirmada && kmConfirmado && !ocrPlacaLoading && !ocrKmLoading;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const kmNum = Number(kmConfirmado);
      const divergenciaPlaca = !!alertaPlaca;
      const divergenciaKm = !!alertaKm;
      let kmRodado: number | null = null;

      if (tipo === "retorno" && registroSaida?.km_confirmado) {
        kmRodado = kmNum - registroSaida.km_confirmado;
      }

      const leituraModo =
        textoPlacaLido !== placaConfirmada || String(kmLido) !== kmConfirmado
          ? "manual"
          : "automatica";

      let statusValidacao = "confirmada";
      if (divergenciaPlaca || divergenciaKm) statusValidacao = "divergente";
      else if (leituraModo === "manual") statusValidacao = "corrigida";
      else if ((confiancaPlaca ?? 0) < 70 || (confiancaKm ?? 0) < 70) statusValidacao = "parcial";

      await createRegistro.mutateAsync({
        carga_id: cargaId,
        tipo_registro: tipo,
        placa_prevista: placaPrevista,
        foto_placa_url: fotoPlacaPreview,
        texto_placa_lido: textoPlacaLido,
        confianca_placa: confiancaPlaca,
        foto_km_url: fotoKmPreview,
        km_lido: kmLido ? Number(kmLido) : null,
        confianca_km: confiancaKm,
        km_confirmado: kmNum,
        placa_confirmada: placaConfirmada,
        km_rodado_real: kmRodado,
        divergencia_placa: divergenciaPlaca,
        divergencia_km: divergenciaKm,
        status_validacao: statusValidacao,
        leitura_modo: leituraModo,
        usuario_id: user?.id ?? null,
      });

      onOpenChange(false);
      resetForm();
    } catch {
      // error handled by mutation
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFotoPlaca(null);
    setFotoKm(null);
    setFotoPlacaPreview(null);
    setFotoKmPreview(null);
    setTextoPlacaLido(null);
    setConfiancaPlaca(null);
    setKmLido(null);
    setConfiancaKm(null);
    setPlacaConfirmada("");
    setKmConfirmado("");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="max-w-lg max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Registrar {tipo === "saida" ? "Saída" : "Retorno"}
          </DialogTitle>
          <DialogDescription>
            Carga: {cargaId} {placaPrevista && `| Placa prevista: ${placaPrevista}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Foto da placa */}
          <CapturaFoto
            label="📷 Foto da Placa"
            onCapture={handleFotoPlaca}
            previewUrl={fotoPlacaPreview}
            disabled={saving}
          />

          <OcrResultado
            label="Placa"
            textoLido={textoPlacaLido}
            confianca={confiancaPlaca}
            valorConfirmado={placaConfirmada}
            onChange={setPlacaConfirmada}
            loading={ocrPlacaLoading}
            alerta={alertaPlaca}
            disabled={saving}
          />

          {/* Foto do KM */}
          <CapturaFoto
            label={`📷 Foto do KM ${tipo === "saida" ? "Inicial" : "Final"}`}
            onCapture={handleFotoKm}
            previewUrl={fotoKmPreview}
            disabled={saving}
          />

          <OcrResultado
            label={tipo === "saida" ? "KM Inicial" : "KM Final"}
            textoLido={kmLido}
            confianca={confiancaKm}
            valorConfirmado={kmConfirmado}
            onChange={setKmConfirmado}
            loading={ocrKmLoading}
            alerta={alertaKm}
            disabled={saving}
          />

          {tipo === "retorno" && registroSaida?.km_confirmado && kmConfirmado && (
            <div className="rounded-lg bg-muted p-3">
              <p className="text-sm">
                KM Inicial: <strong>{registroSaida.km_confirmado}</strong> | KM Final: <strong>{kmConfirmado}</strong>
              </p>
              <p className="text-sm font-bold mt-1">
                KM Rodado: {(Number(kmConfirmado) - registroSaida.km_confirmado).toLocaleString("pt-BR")} km
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { resetForm(); onOpenChange(false); }} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!canSave || saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
            Confirmar e Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
