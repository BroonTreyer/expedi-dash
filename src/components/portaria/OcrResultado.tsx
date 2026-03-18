import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, CheckCircle, Loader2 } from "lucide-react";

interface Props {
  label: string;
  textoLido: string | null;
  confianca: number | null;
  valorConfirmado: string;
  onChange: (v: string) => void;
  loading?: boolean;
  alerta?: string | null;
  disabled?: boolean;
}

export function OcrResultado({
  label,
  textoLido,
  confianca,
  valorConfirmado,
  onChange,
  loading,
  alerta,
  disabled,
}: Props) {
  const confiancaBaixa = confianca !== null && confianca < 70;

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Processando OCR...
        </div>
      )}

      {textoLido !== null && !loading && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground">Leitura automática:</span>
          <Badge variant={confiancaBaixa ? "destructive" : "default"} className="text-xs">
            {textoLido}
          </Badge>
          {confianca !== null && (
            <Badge variant="outline" className="text-xs gap-1">
              {confiancaBaixa ? (
                <AlertTriangle className="h-3 w-3 text-destructive" />
              ) : (
                <CheckCircle className="h-3 w-3 text-accent" />
              )}
              {confianca}%
            </Badge>
          )}
          {confiancaBaixa && (
            <span className="text-xs text-destructive">Confiança baixa — confirme manualmente</span>
          )}
        </div>
      )}

      <Input
        value={valorConfirmado}
        onChange={(e) => onChange(e.target.value)}
        placeholder={`Confirme ${label.toLowerCase()}`}
        disabled={disabled}
      />

      {alerta && (
        <div className="flex items-center gap-1.5 text-xs text-destructive font-medium">
          <AlertTriangle className="h-3.5 w-3.5" />
          {alerta}
        </div>
      )}
    </div>
  );
}
