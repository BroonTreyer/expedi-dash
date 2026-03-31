import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { useMotoristas } from "@/hooks/useMotoristas";
import { Phone } from "lucide-react";

interface Props {
  value: string;
  onChange: (name: string) => void;
  disabled?: boolean;
}

export function MotoristaAutocomplete({ value, onChange, disabled }: Props) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const [debounced, setDebounced] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { setQuery(value); }, [value]);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  const { data: motoristas = [] } = useMotoristas(debounced);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = debounced.trim().length >= 2 ? motoristas.slice(0, 8) : [];

  return (
    <div ref={ref} className="relative">
      <Input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => { if (query.trim().length >= 2) setOpen(true); }}
        placeholder="Digite o nome do motorista..."
        disabled={disabled}
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-md max-h-48 overflow-y-auto">
          {filtered.map((m) => (
            <button
              key={m.id}
              type="button"
              className="w-full px-3 py-2 text-left text-sm hover:bg-accent flex items-center justify-between gap-2"
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(m.nome_completo);
                setQuery(m.nome_completo);
                setOpen(false);
              }}
            >
              <span className="font-medium text-foreground">{m.nome_completo}</span>
              {m.telefone && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Phone className="h-3 w-3" /> {m.telefone}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
