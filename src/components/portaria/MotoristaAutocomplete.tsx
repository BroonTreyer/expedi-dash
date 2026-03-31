import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { CapturaFoto } from "./CapturaFoto";
import { useMotoristas, useCreateMotorista, type Motorista } from "@/hooks/useMotoristas";
import { Phone, FileText, Plus } from "lucide-react";
import { maskCPF, maskPhone } from "@/lib/masks";

interface Props {
  value: string;
  onChange: (name: string) => void;
  onSelect?: (motorista: { nome_completo: string; telefone?: string; cpf?: string }) => void;
  disabled?: boolean;
}

function CadastroRapidoDialog({
  open,
  onOpenChange,
  defaultNome,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  defaultNome: string;
  onCreated: (m: Motorista) => void;
}) {
  const [nome, setNome] = useState(defaultNome);
  const [cpf, setCpf] = useState("");
  const [telefone, setTelefone] = useState("");
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const createMut = useCreateMotorista();

  useEffect(() => { setNome(defaultNome); }, [defaultNome]);

  const handleSubmit = async () => {
    if (!nome.trim()) return;
    const m = await createMut.mutateAsync({
      nome_completo: nome.trim(),
      cpf: cpf.trim() || undefined,
      telefone: telefone.trim() || undefined,
      fotoFile: fotoFile ?? undefined,
    });
    onCreated(m);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Cadastro Rápido de Motorista</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Nome Completo *</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome completo" />
          </div>
           <div className="space-y-2">
             <Label>CPF</Label>
             <Input value={cpf} onChange={(e) => setCpf(maskCPF(e.target.value))} placeholder="000.000.000-00" />
           </div>
           <div className="space-y-2">
             <Label>Telefone</Label>
             <Input value={telefone} onChange={(e) => setTelefone(maskPhone(e.target.value))} placeholder="(00) 00000-0000" />
          </div>
          <CapturaFoto label="Foto do Documento" onCapture={(f) => setFotoFile(f)} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={createMut.isPending || !nome.trim()}>
            {createMut.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function MotoristaAutocomplete({ value, onChange, onSelect, disabled }: Props) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const [debounced, setDebounced] = useState("");
  const [cadastroOpen, setCadastroOpen] = useState(false);
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
  const showNoResults = open && debounced.trim().length >= 2 && filtered.length === 0;

  const handleSelect = (m: Motorista) => {
    onChange(m.nome_completo);
    setQuery(m.nome_completo);
    setOpen(false);
    onSelect?.({ nome_completo: m.nome_completo, telefone: m.telefone || undefined, cpf: m.cpf || undefined });
  };

  return (
    <>
      <div ref={ref} className="relative">
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => { if (query.trim().length >= 2) setOpen(true); }}
          placeholder="Digite o nome ou CPF do motorista..."
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
                  handleSelect(m);
                }}
              >
                <span className="font-medium text-foreground">{m.nome_completo}</span>
                <span className="flex items-center gap-2 text-xs text-muted-foreground">
                  {m.cpf && (
                    <span className="flex items-center gap-1">
                      <FileText className="h-3 w-3" /> {m.cpf}
                    </span>
                  )}
                  {m.telefone && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3" /> {m.telefone}
                    </span>
                  )}
                </span>
              </button>
            ))}
          </div>
        )}
        {showNoResults && (
          <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-md p-2">
            <p className="text-xs text-muted-foreground mb-2">Nenhum motorista encontrado</p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="w-full"
              onMouseDown={(e) => {
                e.preventDefault();
                setOpen(false);
                setCadastroOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-1" /> Cadastrar motorista
            </Button>
          </div>
        )}
      </div>

      <CadastroRapidoDialog
        open={cadastroOpen}
        onOpenChange={setCadastroOpen}
        defaultNome={query}
        onCreated={(m) => handleSelect(m)}
      />
    </>
  );
}
