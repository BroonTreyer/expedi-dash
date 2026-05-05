import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Upload, Trash2, Loader2, FileText } from "lucide-react";
import { useCtesDacte, useDeleteCteDacte } from "@/hooks/useCtesDacte";
import { ImportarDacteDialog } from "./ImportarDacteDialog";
import { supabase } from "@/integrations/supabase/client";

const fmtBRL = (n: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n || 0);
const fmtDate = (s: string) => new Date(s).toLocaleDateString("pt-BR");

export function CtesDacteTab() {
  const { data = [], isLoading } = useCtesDacte();
  const del = useDeleteCteDacte();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("todos");

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return data.filter((r) => {
      if (filterStatus !== "todos" && r.status !== filterStatus) return false;
      if (!term) return true;
      return [r.numero_cte, r.transportadora, r.placa, r.destino_cidade, r.carga_id, (r as any).ordem_carga]
        .some((v) => (v ?? "").toString().toLowerCase().includes(term));
    });
  }, [data, q, filterStatus]);

  const openPdf = async (path: string | null) => {
    if (!path) return;
    const { data } = await supabase.storage.from("dacte").createSignedUrl(path, 3600);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
        <div className="flex gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar..." value={q} onChange={(e) => setQ(e.target.value)} className="pl-9 w-64" />
          </div>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
            <option value="todos">Todos status</option>
            <option value="vinculado">Vinculados</option>
            <option value="pendente">Pendentes</option>
            <option value="divergente">Divergentes</option>
          </select>
        </div>
        <Button onClick={() => setOpen(true)}><Upload className="h-4 w-4 mr-1" /> Importar DACTE (PDF)</Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : (
        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>CT-e</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Transportadora</TableHead>
                <TableHead>Placa</TableHead>
                <TableHead>Destino</TableHead>
                <TableHead>Peso (kg)</TableHead>
                <TableHead>Frete</TableHead>
                <TableHead>Carga</TableHead>
                <TableHead>Ordem</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={11} className="text-center text-sm text-muted-foreground py-6">Nenhum CT-e</TableCell></TableRow>
              )}
              {filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">{r.numero_cte}{r.serie ? `/${r.serie}` : ""}</TableCell>
                  <TableCell className="text-xs">{r.data_emissao ? fmtDate(r.data_emissao) : fmtDate(r.created_at)}</TableCell>
                  <TableCell className="text-xs">{r.transportadora ?? "—"}</TableCell>
                  <TableCell className="text-xs">{r.placa ?? "—"}</TableCell>
                  <TableCell className="text-xs">{r.destino_cidade ? `${r.destino_cidade}/${r.destino_uf ?? ""}` : "—"}</TableCell>
                  <TableCell className="text-xs tabular-nums">{(r.peso_total ?? 0).toLocaleString("pt-BR")}</TableCell>
                  <TableCell className="text-xs tabular-nums">{fmtBRL(Number(r.valor_frete))}</TableCell>
                  <TableCell className="text-xs">{r.carga_id ?? "—"}</TableCell>
                  <TableCell className="text-xs font-mono">{(r as any).ordem_carga ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={r.status === "vinculado" ? "default" : r.status === "divergente" ? "destructive" : "outline"}>
                      {r.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {r.pdf_url && (
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openPdf(r.pdf_url)} title="Ver PDF">
                        <FileText className="h-4 w-4" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { if (confirm("Remover CT-e?")) del.mutate(r.id); }}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <ImportarDacteDialog open={open} onOpenChange={setOpen} />
    </Card>
  );
}