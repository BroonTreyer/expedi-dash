import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusSelect } from "./StatusSelect";
import { EtapaBadge } from "./EtapaBadge";
import { Button } from "@/components/ui/button";
import { Trash2, Edit, ClipboardCheck } from "lucide-react";
import type { Carregamento } from "@/hooks/useCarregamentos";

interface Props {
  data: Carregamento[];
  onStatusChange: (id: string, status: string) => void;
  onEdit: (c: Carregamento) => void;
  onDelete: (id: string) => void;
  onComplete: (c: Carregamento) => void;
}

function formatTime(val: string | null) {
  if (!val) return "—";
  try {
    if (val.includes("T") || val.includes(" ")) {
      return new Date(val).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    }
    return val.substring(0, 5);
  } catch {
    return val;
  }
}

function PendingCell({ value }: { value: string | null }) {
  if (value) return <span className="text-sm">{value}</span>;
  return <span className="text-xs text-muted-foreground/60 italic">Pendente</span>;
}

export function CarregamentoTable({ data, onStatusChange, onEdit, onDelete, onComplete }: Props) {
  return (
    <div className="rounded-lg border border-border bg-card overflow-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40">
            <TableHead className="w-[70px]">Etapa</TableHead>
            <TableHead className="w-[160px]">Status</TableHead>
            <TableHead>Vendedor</TableHead>
            <TableHead>Cód. Produto</TableHead>
            <TableHead>Produto</TableHead>
            <TableHead className="text-right">Qtd</TableHead>
            <TableHead className="text-right">Peso (kg)</TableHead>
            <TableHead>Caminhão</TableHead>
            <TableHead>Placa</TableHead>
            <TableHead>Motorista</TableHead>
            
            <TableHead>UF</TableHead>
            <TableHead>Previsto</TableHead>
            <TableHead>Início</TableHead>
            <TableHead>Fim</TableHead>
            <TableHead>Obs</TableHead>
            <TableHead className="w-[110px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 && (
            <TableRow>
              <TableCell colSpan={17} className="text-center py-8 text-muted-foreground">
                Nenhum carregamento encontrado
              </TableCell>
            </TableRow>
          )}
          {data.map((c) => (
            <TableRow key={c.id} className="hover:bg-muted/30">
              <TableCell><EtapaBadge etapa={c.etapa} /></TableCell>
              <TableCell>
                <StatusSelect value={c.status} onChange={(s) => onStatusChange(c.id, s)} />
              </TableCell>
              <TableCell className="text-sm">{c.vendedores?.nome_vendedor ?? "—"}</TableCell>
              <TableCell className="text-sm font-mono">{c.codigo_produto ?? "—"}</TableCell>
              <TableCell className="text-sm">{c.nome_produto ?? "—"}</TableCell>
              <TableCell className="text-sm text-right">{c.quantidade ?? 0}</TableCell>
              <TableCell className="text-sm text-right font-medium">{(c.peso ?? 0).toLocaleString("pt-BR")}</TableCell>
              <TableCell><PendingCell value={c.tipo_caminhao} /></TableCell>
              <TableCell><PendingCell value={c.placa} /></TableCell>
              <TableCell><PendingCell value={c.motorista} /></TableCell>
              <TableCell className="text-sm">{c.cidade ?? "—"}</TableCell>
              <TableCell className="text-sm">{c.uf ?? "—"}</TableCell>
              <TableCell className="text-sm">{formatTime(c.horario_previsto)}</TableCell>
              <TableCell className="text-sm">{formatTime(c.horario_inicio)}</TableCell>
              <TableCell className="text-sm">{formatTime(c.horario_fim)}</TableCell>
              <TableCell className="text-sm max-w-[120px] truncate" title={c.observacoes ?? ""}>
                {c.observacoes || "—"}
              </TableCell>
              <TableCell>
                <div className="flex gap-1">
                  {c.etapa === "vendas" && (
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-amber-600" title="Completar logística" onClick={() => onComplete(c)}>
                      <ClipboardCheck className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(c)}>
                    <Edit className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDelete(c.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
