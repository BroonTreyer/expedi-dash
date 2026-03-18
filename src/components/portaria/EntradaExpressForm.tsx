import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlacaInput } from "./PlacaInput";
import { useCreateMovimentacao, CATEGORIAS } from "@/hooks/useMovimentacoesPortaria";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Zap, X } from "lucide-react";

interface Props {
  onClose: () => void;
}

export function EntradaExpressForm({ onClose }: Props) {
  const { user } = useAuth();
  const createMov = useCreateMovimentacao();
  const [placa, setPlaca] = useState("");
  const [categoria, setCategoria] = useState("carga_propria");
  const [motorista, setMotorista] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [saving, setSaving] = useState(false);

  const canSave = placa.trim().length >= 3;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      await createMov.mutateAsync({
        tipo_movimento: "entrada",
        categoria,
        placa: placa.trim().toUpperCase(),
        motorista: motorista.trim() || null,
        empresa: empresa.trim() || null,
        destino_setor: null,
        motivo: null,
        carga_id: null,
        foto_placa_url: null,
        texto_placa_lido: null,
        confianca_placa: null,
        placa_confirmada: placa.trim().toUpperCase(),
        foto_documento_url: null,
        observacoes: null,
        usuario_id: user?.id ?? null,
        movimento_vinculado_id: null,
      });
      setPlaca("");
      setCategoria("carga_propria");
      setMotorista("");
      setEmpresa("");
      onClose();
    } catch {
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="border border-primary/20 bg-primary/5 rounded-lg p-4 space-y-3 animate-in slide-in-from-top-2 duration-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-primary">
          <Zap className="h-4 w-4" /> Entrada Rápida
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_160px_auto] gap-3 items-end">
        <PlacaInput
          value={placa}
          onChange={setPlaca}
          onAutofill={(d) => {
            if (d.motorista) setMotorista(d.motorista);
            if (d.empresa) setEmpresa(d.empresa);
            if (d.categoria) setCategoria(d.categoria);
          }}
          disabled={saving}
        />
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Categoria</label>
          <Select value={categoria} onValueChange={setCategoria}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              {CATEGORIAS.map((c) => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={handleSave} disabled={!canSave || saving} className="gap-1.5 h-9">
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
          Registrar
        </Button>
      </div>
    </div>
  );
}
