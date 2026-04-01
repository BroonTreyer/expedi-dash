import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { CheckCircle, RotateCcw, Loader2, Truck } from "lucide-react";
import { usePlacaAutocomplete } from "@/hooks/useMovimentacoesPortaria";
import { useCaminhoes } from "@/hooks/useCaminhoes";
import { useEffect, useRef, useCallback } from "react";

interface Props {
  value: string;
  onChange: (v: string) => void;
  onAutofill?: (data: { motorista?: string; empresa?: string; categoria?: string; destino_setor?: string; tipo_caminhao?: string; telefone?: string }) => void;
  disabled?: boolean;
}

const PLACA_REGEX = /^[A-Z]{3}\d[A-Z0-9]\d{2}$/;

function formatPlaca(raw: string): string {
  return raw.replace(/[^A-Z0-9]/gi, "").toUpperCase().slice(0, 7);
}

export function PlacaInput({ value, onChange, onAutofill, disabled }: Props) {
  const { data: autocomplete, isLoading } = usePlacaAutocomplete(value);
  const { data: caminhoes = [] } = useCaminhoes(value.length >= 3 ? value : "");
  const lastAutofillRef = useRef<string>("");
  const lastCaminhaoRef = useRef<string>("");
  const onAutofillRef = useRef(onAutofill);
  onAutofillRef.current = onAutofill;
  const isValid = PLACA_REGEX.test(value);
  const showValidation = value.length >= 4;

  // Find exact match from caminhoes table
  const caminhaoMatch = caminhoes.find((c) => c.placa === value);

  // Auto-fill from caminhoes table (priority over movimentacoes history)
  useEffect(() => {
    if (caminhaoMatch && caminhaoMatch.placa !== lastCaminhaoRef.current && onAutofillRef.current) {
      lastCaminhaoRef.current = caminhaoMatch.placa;
      lastAutofillRef.current = caminhaoMatch.placa;
      onAutofillRef.current({
        motorista: caminhaoMatch.motorista?.nome_completo || undefined,
        tipo_caminhao: caminhaoMatch.tipo_caminhao || undefined,
        telefone: caminhaoMatch.motorista?.telefone || undefined,
      });
    }
  }, [caminhaoMatch]);

  // Auto-fill from movimentacoes history (fallback)
  useEffect(() => {
    if (autocomplete && autocomplete.placa && autocomplete.placa !== lastAutofillRef.current && onAutofillRef.current && !caminhaoMatch) {
      lastAutofillRef.current = autocomplete.placa;
      onAutofillRef.current({
        motorista: autocomplete.motorista || undefined,
        empresa: autocomplete.empresa || undefined,
        categoria: autocomplete.categoria || undefined,
        destino_setor: autocomplete.destino_setor || undefined,
      });
    }
  }, [autocomplete, caminhaoMatch]);

  return (
    <div className="space-y-1.5">
      <Label className="flex items-center gap-2">
        Placa *
        {isLoading && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
        {caminhaoMatch && (
          <Badge variant="secondary" className="text-[10px] gap-1 px-1.5 py-0">
            <Truck className="h-2.5 w-2.5" /> Cadastrado
          </Badge>
        )}
        {!caminhaoMatch && autocomplete && autocomplete.totalRegistros >= 3 && (
          <Badge variant="secondary" className="text-[10px] gap-1 px-1.5 py-0">
            <RotateCcw className="h-2.5 w-2.5" /> Recorrente
          </Badge>
        )}
      </Label>
      <div className="relative">
        <Input
          value={value}
          onChange={(e) => onChange(formatPlaca(e.target.value))}
          placeholder="ABC1D23"
          disabled={disabled}
          className={showValidation ? (isValid ? "border-accent pr-8" : "border-destructive pr-8") : ""}
          maxLength={7}
        />
        {showValidation && isValid && (
          <CheckCircle className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-accent" />
        )}
      </div>
      {caminhaoMatch && caminhaoMatch.motorista && (
        <p className="text-[11px] text-muted-foreground">
          <Truck className="h-3 w-3 inline mr-1" />
          {caminhaoMatch.motorista.nome_completo}
          {caminhaoMatch.tipo_caminhao && ` • ${caminhaoMatch.tipo_caminhao}`}
        </p>
      )}
      {!caminhaoMatch && autocomplete && autocomplete.motorista && (
        <p className="text-[11px] text-muted-foreground">
          Último registro: {autocomplete.motorista} — {autocomplete.empresa || "sem empresa"}
        </p>
      )}
    </div>
  );
}
