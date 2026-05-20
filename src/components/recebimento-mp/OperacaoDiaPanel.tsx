import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Plus, Printer, CheckCircle2, ClipboardList, Truck, FileSpreadsheet } from "lucide-react";
import { useRecebimentosMp, type RecebimentoMp } from "@/hooks/useRecebimentosMp";
import { RegistrarChegadaDialog } from "./RegistrarChegadaDialog";
import { ConferenciaDescargaDialog } from "./ConferenciaDescargaDialog";
import { PagamentoDialog } from "./PagamentoDialog";
import { ReciboDescargaPrintDialog } from "./ReciboDescargaPrintDialog";
import { ImportarRecebimentosMpDialog } from "./ImportarRecebimentosMpDialog";
import { formatarBRL } from "@/lib/peso-mp";

function todayISO() { return new Date().toISOString().slice(0, 10); }

const STATUS_LABELS: Record<string, { label: string; variant: any }> = {
  aguardando_descarga: { label: "Aguardando descarga", variant: "secondary" },
  descarregando: { label: "Descarregando", variant: "secondary" },
  aguardando_pagamento: { label: "Aguardando pagamento", variant: "outline" },
  pago: { label: "Pago", variant: "default" },
  liberado: { label: "Liberado", variant: "default" },
  cancelado: { label: "Cancelado", variant: "destructive" },
};

export function OperacaoDiaPanel() {
  const [data, setData] = useState(todayISO());
  const [busca, setBusca] = useState("");
  const { data: rows = [], isLoading } = useRecebimentosMp(data || undefined);

  const [openRegistrar, setOpenRegistrar] = useState(false);
  const [openImportar, setOpenImportar] = useState(false);
  const [conferencia, setConferencia] = useState<RecebimentoMp | null>(null);
  const [pagamento, setPagamento] = useState<RecebimentoMp | null>(null);
  const [reciboPrint, setReciboPrint] = useState<RecebimentoMp | null>(null);

  const filtered = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.placa, r.motorista, r.fornecedor_nome, r.recibo_numero].some((v) => v?.toLowerCase().includes(q))
    );
  }, [rows, busca]);

  const kpis = useMemo(() => {
    let aguardandoDescarga = 0, aguardandoPag = 0, pago = 0, ton = 0, valor = 0;
    for (const r of rows) {
      if (r.status_geral === "aguardando_descarga") aguardandoDescarga++;
      if (r.status_geral === "aguardando_pagamento") aguardandoPag++;
      if (r.status_geral === "pago" || r.status_geral === "liberado") pago++;
      ton += Number(r.peso_total_ton ?? 0);
      valor += Number(r.valor_total ?? 0);
    }
    return { aguardandoDescarga, aguardandoPag, pago, ton, valor };
  }, [rows]);

  function openByStatus(r: RecebimentoMp) {
    if (r.status_geral === "aguardando_descarga" || r.status_geral === "descarregando") setConferencia(r);
    else setPagamento(r);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-end gap-2">
        <Button variant="outline" onClick={() => setOpenImportar(true)}>
          <FileSpreadsheet className="h-4 w-4 mr-2" /> Importar planilha
        </Button>
        <Button onClick={() => setOpenRegistrar(true)}><Plus className="h-4 w-4 mr-2" /> Registrar Chegada</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KpiCard label="Aguardando descarga" value={kpis.aguardandoDescarga} icon={ClipboardList} />
        <KpiCard label="Aguardando pagamento" value={kpis.aguardandoPag} icon={ClipboardList} />
        <KpiCard label="Pagos / Liberados" value={kpis.pago} icon={CheckCircle2} />
        <KpiCard label="Total toneladas" value={kpis.ton.toLocaleString("pt-BR", { minimumFractionDigits: 3 })} icon={Truck} />
        <KpiCard label="Total R$" value={formatarBRL(kpis.valor)} icon={CheckCircle2} />
      </div>

      <Card><CardContent className="p-4 flex flex-col md:flex-row gap-3">
        <Input type="date" value={data} onChange={(e) => setData(e.target.value)} className="md:w-44" />
        <Input placeholder="Buscar placa, motorista, fornecedor, recibo..." value={busca} onChange={(e) => setBusca(e.target.value)} />
      </CardContent></Card>

      <Card><CardContent className="p-0 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Recibo</TableHead>
              <TableHead>Hora</TableHead>
              <TableHead>Placa</TableHead>
              <TableHead>Motorista</TableHead>
              <TableHead>Fornecedor</TableHead>
              <TableHead className="text-right">Ton</TableHead>
              <TableHead className="text-right">R$ Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-6">Carregando...</TableCell></TableRow>}
            {!isLoading && filtered.length === 0 && <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-6">Nenhum recebimento</TableCell></TableRow>}
            {filtered.map((r) => {
              const s = STATUS_LABELS[r.status_geral] ?? { label: r.status_geral, variant: "secondary" as const };
              return (
                <TableRow key={r.id} className="cursor-pointer hover:bg-muted/40" onClick={() => openByStatus(r)}>
                  <TableCell className="font-mono text-xs">{r.recibo_numero}</TableCell>
                  <TableCell className="text-xs">{r.hora_chegada?.slice(0, 5) ?? "—"}</TableCell>
                  <TableCell className="font-mono">{r.placa ?? "—"}</TableCell>
                  <TableCell>{r.motorista ?? "—"}</TableCell>
                  <TableCell>{r.fornecedor_nome ?? "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">{Number(r.peso_total_ton).toLocaleString("pt-BR", { minimumFractionDigits: 3 })}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatarBRL(Number(r.valor_total))}</TableCell>
                  <TableCell><Badge variant={s.variant}>{s.label}</Badge></TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <Button size="sm" variant="ghost" onClick={() => setReciboPrint(r)} title="Imprimir recibo">
                      <Printer className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent></Card>

      <RegistrarChegadaDialog open={openRegistrar} onOpenChange={setOpenRegistrar} />
      <ImportarRecebimentosMpDialog open={openImportar} onOpenChange={setOpenImportar} />
      <ConferenciaDescargaDialog open={!!conferencia} onOpenChange={(v) => !v && setConferencia(null)} recebimento={conferencia} />
      <PagamentoDialog open={!!pagamento} onOpenChange={(v) => !v && setPagamento(null)} recebimento={pagamento} />
      <ReciboDescargaPrintDialog open={!!reciboPrint} onOpenChange={(v) => !v && setReciboPrint(null)} recebimento={reciboPrint} />
    </div>
  );
}

function KpiCard({ label, value, icon: Icon }: { label: string; value: any; icon: any }) {
  return (
    <Card><CardContent className="p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
          <div className="text-xl font-bold tabular-nums mt-1">{value}</div>
        </div>
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>
    </CardContent></Card>
  );
}