import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Plus, Trash2, Loader2 } from "lucide-react";
import { useTabelaFrete, useUpsertTabelaFrete, useDeleteTabelaFrete, type TabelaFreteRow } from "@/hooks/useTabelaFrete";
import { toast } from "sonner";

type Linha = { destino_cidade: string; destino_uf: string; bitruck?: TabelaFreteRow; carreta?: TabelaFreteRow };

export function TabelaFreteTab() {
  const { data = [], isLoading } = useTabelaFrete();
  const upsert = useUpsertTabelaFrete();
  const del = useDeleteTabelaFrete();
  const [q, setQ] = useState("");
  const [novoDestino, setNovoDestino] = useState("");
  const [novoUf, setNovoUf] = useState("");

  const linhas: Linha[] = useMemo(() => {
    const map = new Map<string, Linha>();
    for (const r of data) {
      const key = `${r.destino_cidade.toLowerCase()}|${r.destino_uf.toLowerCase()}`;
      const cur = map.get(key) ?? { destino_cidade: r.destino_cidade, destino_uf: r.destino_uf };
      if (r.tipo_veiculo === "bitruck") cur.bitruck = r;
      else cur.carreta = r;
      map.set(key, cur);
    }
    const list = Array.from(map.values());
    const term = q.trim().toLowerCase();
    return term
      ? list.filter((l) => l.destino_cidade.toLowerCase().includes(term) || l.destino_uf.toLowerCase().includes(term))
      : list;
  }, [data, q]);

  const salvar = async (cidade: string, uf: string, tipo: "bitruck" | "carreta", valor: number) => {
    await upsert.mutateAsync({ destino_cidade: cidade, destino_uf: uf, tipo_veiculo: tipo, valor_kg: valor });
  };

  const adicionarLinha = () => {
    if (!novoDestino.trim() || !novoUf.trim()) return toast.error("Preencha destino e UF");
    upsert.mutate({ destino_cidade: novoDestino, destino_uf: novoUf, tipo_veiculo: "bitruck", valor_kg: 0 });
    upsert.mutate({ destino_cidade: novoDestino, destino_uf: novoUf, tipo_veiculo: "carreta", valor_kg: 0 });
    setNovoDestino(""); setNovoUf("");
  };

  const removerLinha = async (linha: Linha) => {
    if (!confirm(`Remover ${linha.destino_cidade}/${linha.destino_uf}?`)) return;
    if (linha.bitruck) await del.mutateAsync(linha.bitruck.id);
    if (linha.carreta) await del.mutateAsync(linha.carreta.id);
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar destino..." value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-2">
          <Input placeholder="Cidade" value={novoDestino} onChange={(e) => setNovoDestino(e.target.value)} className="w-40" />
          <Input placeholder="UF" maxLength={2} value={novoUf} onChange={(e) => setNovoUf(e.target.value.toUpperCase())} className="w-20" />
          <Button onClick={adicionarLinha} size="sm"><Plus className="h-4 w-4 mr-1" /> Adicionar</Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : (
        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Destino</TableHead>
                <TableHead className="w-20">UF</TableHead>
                <TableHead className="w-40">Bitruck (R$/kg)</TableHead>
                <TableHead className="w-40">Carreta (R$/kg)</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {linhas.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-6">Nenhum destino cadastrado</TableCell></TableRow>
              )}
              {linhas.map((l) => (
                <TableRow key={`${l.destino_cidade}-${l.destino_uf}`}>
                  <TableCell className="font-medium">{l.destino_cidade}</TableCell>
                  <TableCell>{l.destino_uf}</TableCell>
                  <TableCell>
                    <Input type="number" step="0.01" defaultValue={l.bitruck?.valor_kg ?? 0}
                      onBlur={(e) => salvar(l.destino_cidade, l.destino_uf, "bitruck", Number(e.target.value))}
                      className="h-8" />
                  </TableCell>
                  <TableCell>
                    <Input type="number" step="0.01" defaultValue={l.carreta?.valor_kg ?? 0}
                      onBlur={(e) => salvar(l.destino_cidade, l.destino_uf, "carreta", Number(e.target.value))}
                      className="h-8" />
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removerLinha(l)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </Card>
  );
}