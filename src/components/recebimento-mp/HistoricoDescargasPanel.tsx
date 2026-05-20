import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Printer } from "lucide-react";
import { useRecebimentosMpHistorico } from "@/hooks/useRecebimentosMpHistorico";
import { useFornecedoresMp } from "@/hooks/useFornecedoresMp";
import { formatarBRL } from "@/lib/peso-mp";
import { ConferenciaDescargaDialog } from "./ConferenciaDescargaDialog";
import { PagamentoDialog } from "./PagamentoDialog";
import { ReciboDescargaPrintDialog } from "./ReciboDescargaPrintDialog";
import type { RecebimentoMp } from "@/hooks/useRecebimentosMp";
import * as XLSX from "xlsx";

function isoMinus(days: number) {
  const d = new Date(); d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

const STATUS: Record<string, { label: string; variant: any }> = {
  aguardando_descarga: { label: "Aguard. descarga", variant: "secondary" },
  descarregando: { label: "Descarregando", variant: "secondary" },
  aguardando_pagamento: { label: "Aguard. pagamento", variant: "outline" },
  pago: { label: "Pago", variant: "default" },
  liberado: { label: "Liberado", variant: "default" },
  cancelado: { label: "Cancelado", variant: "destructive" },
};

export function HistoricoDescargasPanel() {
  const [de, setDe] = useState(isoMinus(30));
  const [ate, setAte] = useState(isoMinus(0));
  const [fornecedorId, setFornecedorId] = useState<string>("todos");
  const [motorista, setMotorista] = useState("");
  const [placa, setPlaca] = useState("");
  const [status, setStatus] = useState("todos");

  const { data: fornecedores = [] } = useFornecedoresMp();
  const { data: rows = [], isLoading } = useRecebimentosMpHistorico({
    de, ate,
    fornecedorId: fornecedorId === "todos" ? null : fornecedorId,
    motorista: motorista || undefined,
    placa: placa || undefined,
    status,
  });

  const [conferencia, setConferencia] = useState<RecebimentoMp | null>(null);
  const [pagamento, setPagamento] = useState<RecebimentoMp | null>(null);
  const [reciboPrint, setReciboPrint] = useState<RecebimentoMp | null>(null);

  const totais = useMemo(() => {
    let ton = 0, valor = 0;
    for (const r of rows) { ton += Number(r.peso_total_ton ?? 0); valor += Number(r.valor_total ?? 0); }
    return { ton, valor, qtd: rows.length };
  }, [rows]);

  function exportXLSX() {
    const ws = XLSX.utils.json_to_sheet(rows.map((r) => ({
      Recibo: r.recibo_numero,
      Data: r.data_chegada,
      Hora: r.hora_chegada,
      Placa: r.placa,
      Motorista: r.motorista,
      Fornecedor: r.fornecedor_nome,
      Toneladas: Number(r.peso_total_ton ?? 0),
      "R$/ton (média)": Number(r.peso_total_ton ?? 0) > 0 ? Number(r.valor_total ?? 0) / Number(r.peso_total_ton) : 0,
      "Valor Total": Number(r.valor_total ?? 0),
      Status: r.status_geral,
      Pagamento: r.pagamento_status,
      Conferente: r.conferente,
      Pallets: r.pallets_quantidade,
      "Pallets Devolvidos": r.pallets_devolvidos ? "Sim" : "Não",
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Histórico");
    XLSX.writeFile(wb, `recebimento-mp-${de}-a-${ate}.xlsx`);
  }

  function openByStatus(r: RecebimentoMp) {
    if (r.status_geral === "aguardando_descarga" || r.status_geral === "descarregando") setConferencia(r);
    else setPagamento(r);
  }

  return (
    <div className="space-y-4">
      <Card><CardContent className="p-4 grid grid-cols-2 md:grid-cols-7 gap-3 items-end">
        <div><label className="text-[11px] uppercase text-muted-foreground">De</label>
          <Input type="date" value={de} onChange={(e) => setDe(e.target.value)} /></div>
        <div><label className="text-[11px] uppercase text-muted-foreground">Até</label>
          <Input type="date" value={ate} onChange={(e) => setAte(e.target.value)} /></div>
        <div className="col-span-2"><label className="text-[11px] uppercase text-muted-foreground">Fornecedor</label>
          <Select value={fornecedorId} onValueChange={setFornecedorId}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {fornecedores.map((f) => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
            </SelectContent>
          </Select></div>
        <div><label className="text-[11px] uppercase text-muted-foreground">Motorista</label>
          <Input value={motorista} onChange={(e) => setMotorista(e.target.value)} placeholder="Nome..." /></div>
        <div><label className="text-[11px] uppercase text-muted-foreground">Placa</label>
          <Input value={placa} onChange={(e) => setPlaca(e.target.value.toUpperCase())} placeholder="ABC1D23" /></div>
        <div><label className="text-[11px] uppercase text-muted-foreground">Status</label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {Object.entries(STATUS).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
            </SelectContent>
          </Select></div>
      </CardContent></Card>

      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          <b>{totais.qtd}</b> descargas · <b>{totais.ton.toLocaleString("pt-BR", { minimumFractionDigits: 3 })}</b> ton · <b>{formatarBRL(totais.valor)}</b>
        </div>
        <Button variant="outline" size="sm" onClick={exportXLSX} disabled={!rows.length}>
          <Download className="h-4 w-4 mr-2" /> Exportar XLSX
        </Button>
      </div>

      <Card><CardContent className="p-0 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Recibo</TableHead>
              <TableHead>Placa</TableHead>
              <TableHead>Motorista</TableHead>
              <TableHead>Fornecedor</TableHead>
              <TableHead className="text-right">Ton</TableHead>
              <TableHead className="text-right">R$</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-6">Carregando...</TableCell></TableRow>}
            {!isLoading && rows.length === 0 && <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-6">Nada no período</TableCell></TableRow>}
            {rows.map((r) => {
              const s = STATUS[r.status_geral] ?? { label: r.status_geral, variant: "secondary" as const };
              return (
                <TableRow key={r.id} className="cursor-pointer hover:bg-muted/40" onClick={() => openByStatus(r)}>
                  <TableCell className="text-xs">{r.data_chegada.split("-").reverse().join("/")}</TableCell>
                  <TableCell className="font-mono text-xs">{r.recibo_numero}</TableCell>
                  <TableCell className="font-mono">{r.placa ?? "—"}</TableCell>
                  <TableCell>{r.motorista ?? "—"}</TableCell>
                  <TableCell>{r.fornecedor_nome ?? "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">{Number(r.peso_total_ton).toLocaleString("pt-BR", { minimumFractionDigits: 3 })}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatarBRL(Number(r.valor_total))}</TableCell>
                  <TableCell><Badge variant={s.variant}>{s.label}</Badge></TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <Button size="sm" variant="ghost" onClick={() => setReciboPrint(r)}><Printer className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent></Card>

      <ConferenciaDescargaDialog open={!!conferencia} onOpenChange={(v) => !v && setConferencia(null)} recebimento={conferencia} />
      <PagamentoDialog open={!!pagamento} onOpenChange={(v) => !v && setPagamento(null)} recebimento={pagamento} />
      <ReciboDescargaPrintDialog open={!!reciboPrint} onOpenChange={(v) => !v && setReciboPrint(null)} recebimento={reciboPrint} />
    </div>
  );
}