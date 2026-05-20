import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Loader2 } from "lucide-react";
import { useMotoristasMp, type MotoristaMpAgg } from "@/hooks/useMotoristasMp";
import { MotoristaMpDetalheDrawer } from "./MotoristaMpDetalheDrawer";
import { formatarBRL } from "@/lib/peso-mp";

export function MotoristasMpPanel() {
  const { data = [], isLoading } = useMotoristasMp();
  const [busca, setBusca] = useState("");
  const [sel, setSel] = useState<MotoristaMpAgg | null>(null);
  const filtered = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return data;
    return data.filter((m) => [m.nome, m.cpf, ...m.placas].some((v) => v?.toLowerCase().includes(q)));
  }, [data, busca]);

  return (
    <div className="space-y-3">
      <Card><CardContent className="p-4">
        <Input placeholder="Buscar motorista, CPF ou placa..." value={busca} onChange={(e) => setBusca(e.target.value)} />
      </CardContent></Card>
      <Card><CardContent className="p-0 overflow-x-auto">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Motorista</TableHead><TableHead>CPF</TableHead><TableHead>Telefone</TableHead>
            <TableHead>Placas</TableHead><TableHead className="text-right">Entregas</TableHead>
            <TableHead className="text-right">Ton</TableHead><TableHead className="text-right">R$</TableHead>
            <TableHead>Última visita</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={8} className="text-center py-6"><Loader2 className="h-5 w-5 animate-spin inline" /></TableCell></TableRow>}
            {!isLoading && filtered.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-6">Sem motoristas</TableCell></TableRow>}
            {filtered.map((m) => (
              <TableRow key={m.chave} className="cursor-pointer hover:bg-muted/40" onClick={() => setSel(m)}>
                <TableCell className="font-medium">{m.nome}</TableCell>
                <TableCell className="font-mono text-xs">{m.cpf ?? "—"}</TableCell>
                <TableCell className="text-xs">{m.telefone ?? "—"}</TableCell>
                <TableCell className="font-mono text-xs">{m.placas.join(", ") || "—"}</TableCell>
                <TableCell className="text-right tabular-nums">{m.totalEntregas}</TableCell>
                <TableCell className="text-right tabular-nums">{m.totalTon.toLocaleString("pt-BR", { minimumFractionDigits: 3 })}</TableCell>
                <TableCell className="text-right tabular-nums">{formatarBRL(m.totalValor)}</TableCell>
                <TableCell className="text-xs">{m.ultimaVisita?.split("-").reverse().join("/") ?? "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>
      <MotoristaMpDetalheDrawer motorista={sel} onClose={() => setSel(null)} />
    </div>
  );
}