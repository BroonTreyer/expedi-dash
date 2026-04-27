import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateCliente } from "@/hooks/useClientes";
import { UF_LIST } from "@/lib/constants";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (cliente: { codigo_cliente: string; nome_cliente: string; cidade?: string | null; uf?: string | null }) => void;
  defaultCodigo?: string;
}

export function NovoClienteInline({ open, onOpenChange, onCreated, defaultCodigo = "" }: Props) {
  const [codigo, setCodigo] = useState(defaultCodigo);
  const [nome, setNome] = useState("");
  const [cidade, setCidade] = useState("");
  const [uf, setUf] = useState<string>("");
  const [cep, setCep] = useState("");
  const create = useCreateCliente();

  const reset = () => {
    setCodigo(""); setNome(""); setCidade(""); setUf(""); setCep("");
  };

  const handleSubmit = async () => {
    try {
      const created = await create.mutateAsync({
        codigo_cliente: codigo,
        nome_cliente: nome,
        cidade: cidade || undefined,
        uf: uf || undefined,
        cep: cep || undefined,
        ativo: true,
      } as any);
      onCreated({
        codigo_cliente: created?.codigo_cliente ?? codigo,
        nome_cliente: created?.nome_cliente ?? nome,
        cidade: created?.cidade ?? cidade,
        uf: created?.uf ?? uf,
      });
      reset();
      onOpenChange(false);
    } catch {/* toast já mostrado pela mutation */}
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Novo Cliente</DialogTitle>
          <DialogDescription>Cadastre um cliente para usar no pedido.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Código *</Label>
            <Input value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="Ex: 12345" />
          </div>
          <div>
            <Label>Nome *</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Razão social ou nome fantasia" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <Label>Cidade</Label>
              <Input value={cidade} onChange={(e) => setCidade(e.target.value)} />
            </div>
            <div>
              <Label>UF</Label>
              <Select value={uf} onValueChange={setUf}>
                <SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger>
                <SelectContent>
                  {UF_LIST.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>CEP</Label>
            <Input value={cep} onChange={(e) => setCep(e.target.value)} placeholder="00000-000" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={create.isPending || !codigo.trim() || !nome.trim()}>
            {create.isPending ? "Salvando..." : "Salvar cliente"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}