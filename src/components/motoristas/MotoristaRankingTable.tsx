import { useMemo, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { MotoristaSparkline } from "./MotoristaSparkline";
import { formatDuracao } from "@/lib/portaria-tempos";
import type { MotoristaAgg } from "@/hooks/useMotoristasPainel";
import { ArrowUpDown } from "lucide-react";

const fmtKm = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
const fmtKg = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
const fmtData = (s: string | null) => {
  if (!s) return "—";
  const d = new Date(s);
  return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
};

type SortKey = "nome" | "rotas" | "km_total" | "tempo" | "peso" | "entregas" | "ultima";

interface Props {
  data: MotoristaAgg[];
  onSelect: (m: MotoristaAgg) => void;
}

export function MotoristaRankingTable({ data, onSelect }: Props) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("km_total");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const arr = q ? data.filter((d) => d.nome.toLowerCase().includes(q)) : [...data];
    arr.sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      switch (sortKey) {
        case "nome": return a.nome.localeCompare(b.nome) * dir;
        case "rotas": return (a.rotas - b.rotas) * dir;
        case "tempo": return ((a.tempo_medio_min ?? 0) - (b.tempo_medio_min ?? 0)) * dir;
        case "peso": return (a.peso_total - b.peso_total) * dir;
        case "entregas": return (a.entregas_total - b.entregas_total) * dir;
        case "ultima": return (new Date(a.ultima_atividade ?? 0).getTime() - new Date(b.ultima_atividade ?? 0).getTime()) * dir;
        case "km_total":
        default: return (a.km_total - b.km_total) * dir;
      }
    });
    return arr;
  }, [data, search, sortKey, sortDir]);

  const toggle = (k: SortKey) => {
    if (sortKey === k) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(k); setSortDir("desc"); }
  };

  const Th = ({ k, children, className }: { k: SortKey; children: React.ReactNode; className?: string }) => (
    <TableHead className={className}>
      <button
        onClick={() => toggle(k)}
        className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
      >
        {children}
        <ArrowUpDown className="h-3 w-3 opacity-50" />
      </button>
    </TableHead>
  );

  return (
    <div className="space-y-3">
      <Input
        placeholder="Buscar motorista..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-xs"
      />
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <Th k="nome">Motorista</Th>
              <Th k="rotas" className="text-right">Rotas</Th>
              <Th k="km_total" className="text-right">KM total</Th>
              <TableHead className="text-right">KM médio</TableHead>
              <Th k="tempo" className="text-right">Tempo médio</Th>
              <Th k="peso" className="text-right">Peso (kg)</Th>
              <Th k="entregas" className="text-right">Entregas</Th>
              <TableHead>Tendência</TableHead>
              <Th k="ultima">Última atividade</Th>
              <TableHead className="text-center">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                  Nenhum motorista no período
                </TableCell>
              </TableRow>
            ) : filtered.map((m) => (
              <TableRow
                key={m.nome}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => onSelect(m)}
              >
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-7 w-7">
                      {m.cadastro?.foto_motorista_url && <AvatarImage src={m.cadastro.foto_motorista_url} />}
                      <AvatarFallback className="text-[10px]">
                        {m.nome.split(" ").slice(0, 2).map((s) => s[0]).join("").toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium text-sm">{m.nome}</span>
                  </div>
                </TableCell>
                <TableCell className="text-right tabular-nums">{m.rotas}</TableCell>
                <TableCell className="text-right tabular-nums">{fmtKm(m.km_total)}</TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">{fmtKm(m.km_medio)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatDuracao(m.tempo_medio_min ?? undefined)}</TableCell>
                <TableCell className="text-right tabular-nums">{fmtKg(m.peso_total)}</TableCell>
                <TableCell className="text-right tabular-nums">{m.entregas_total}</TableCell>
                <TableCell><MotoristaSparkline data={m.km_por_dia} /></TableCell>
                <TableCell className="text-xs text-muted-foreground">{fmtData(m.ultima_atividade)}</TableCell>
                <TableCell className="text-center">
                  {m.em_rota ? (
                    <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20">Em rota</Badge>
                  ) : (
                    <Badge variant="secondary">Disponível</Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
