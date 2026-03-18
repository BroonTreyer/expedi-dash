import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { CheckCircle, RotateCcw, Loader2 } from "lucide-react";
import { usePlacaAutocomplete } from "@/hooks/useMovimentacoesPortaria";
import { useEffect, useRef } from "react";

interface Props {
  value: string;
  onChange: (v: string) => void;
  onAutofill?: (data: { motorista?: string; empresa?: string; categoria?: string; destino_setor?: string }) => void;
  disabled?: boolean;
}

const PLACA_REGEX = /^[A-Z]{3}\d[A-Z0-9]\d{2}$/;

function formatPlaca(raw: string): string {
  return raw.replace(/[^A-Z0-9]/gi, "").toUpperCase().slice(0, 7);
}

export function PlacaInput({ value, onChange, onAutofill, disabled }: Props) {
  const { data: autocomplete, isLoading } = usePlacaAutocomplete(value);
  const lastAutofillRef = useRef<string>("");
  const isValid = PLACA_REGEX.test(value);
  const showValidation = value.length >= 4;

  // Auto-fill when autocomplete data arrives for a new plate
  useEffect(() => {
    if (autocomplete && autocomplete.placa && autocomplete.placa !== lastAutofillRef.current && onAutofill) {
      lastAutofillRef.current = autocomplete.placa;
      onAutofill({
        motorista: autocomplete.motorista || undefined,
        empresa: autocomplete.empresa || undefined,
        categoria: autocomplete.categoria || undefined,
        destino_setor: autocomplete.destino_setor || undefined,
      });
    }
  }, [autocomplete, onAutofill]);

  return (
    <div className="space-y-1.5">
      <Label className="flex items-center gap-2">
        Placa *
        {isLoading && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
        {autocomplete && autocomplete.totalRegistros >= 3 && (
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
      {autocomplete && autocomplete.motorista && (
        <p className="text-[11px] text-muted-foreground">
          Último registro: {autocomplete.motorista} — {autocomplete.empresa || "sem empresa"}
        </p>
      )}
    </div>
  );
}
