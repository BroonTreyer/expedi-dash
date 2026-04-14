import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useCaminhoes, type Caminhao } from "@/hooks/useCaminhoes";
import { Truck, Phone, FileText, Plus } from "lucide-react";

interface Props {
  value: string;
  onChange: (placa: string) => void;
  onSelect?: (caminhao: {
    placa: string;
    tipo_caminhao?: string;
    motorista?: string;
    telefone?: string;
    cpf?: string;
    renavam?: string;
    transportadora?: string;
  }) => void;
  disabled?: boolean;
}

export function CaminhaoAutocomplete({ value, onChange, onSelect, disabled }: Props) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const [debounced, setDebounced] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { setQuery(value); }, [value]);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  const { data: caminhoes = [] } = useCaminhoes(debounced);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = debounced.trim().length >= 2 ? caminhoes.slice(0, 8) : [];

  const handleSelect = (c: Caminhao) => {
    onChange(c.placa);
    setQuery(c.placa);
    setOpen(false);
    onSelect?.({
      placa: c.placa,
      tipo_caminhao: c.tipo_caminhao || undefined,
      motorista: c.motorista?.nome_completo || undefined,
      telefone: c.motorista?.telefone || undefined,
      cpf: c.motorista?.cpf || undefined,
      renavam: c.renavam || undefined,
      transportadora: c.transportadora || undefined,
    });
  };

  return (
    <div ref={ref} className="relative">
      <Input
        value={query}
        onChange={(e) => {
          const v = e.target.value.toUpperCase();
          setQuery(v);
          onChange(v);
          setOpen(true);
        }}
        onFocus={() => { if (query.trim().length >= 2) setOpen(true); }}
        placeholder="Digite a placa..."
        disabled={disabled}
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-md max-h-48 overflow-y-auto">
          {filtered.map((c) => (
            <button
              key={c.id}
              type="button"
              className="w-full px-3 py-2 text-left text-sm hover:bg-accent flex items-center justify-between gap-2"
              onMouseDown={(e) => { e.preventDefault(); handleSelect(c); }}
            >
              <span className="flex items-center gap-2">
                <Truck className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="font-medium text-foreground">{c.placa}</span>
                {c.tipo_caminhao && <span className="text-xs text-muted-foreground">({c.tipo_caminhao})</span>}
              </span>
              {c.motorista && (
                <span className="text-xs text-muted-foreground truncate max-w-[180px]">
                  {c.motorista.nome_completo}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
