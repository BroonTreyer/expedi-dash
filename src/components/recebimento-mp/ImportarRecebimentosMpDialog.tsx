import { useState } from "react";
import * as XLSX from "xlsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, FileSpreadsheet } from "lucide-react";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface Props { open: boolean; onOpenChange: (v: boolean) => void; }

type Item = { peso_ton: number; nota_fiscal: string | null; valor_unitario: number; nome_produto: string };
type Parsed = {
  fornecedor_nome: string | null;
  data_chegada: string | null; // ISO
  hora_chegada: string | null;
  motorista: string | null;
  telefone: string | null;
  cpf: string | null;
  placa: string | null;
  conferente: string | null;
  pallets_quantidade: number | null;
  pallets_devolvidos: boolean;
  itens: Item[];
};

function toStr(v: any): string { return v == null ? "" : String(v).trim(); }
function toNum(v: any): number {
  if (v == null || v === "") return 0;
  if (typeof v === "number") return v;
  const s = String(v).replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const n = Number(s); return isFinite(n) ? n : 0;
}
function excelDateToISO(v: any): string | null {
  if (v == null || v === "") return null;
  if (typeof v === "number") {
    const d = XLSX.SSF.parse_date_code(v);
    if (!d) return null;
    return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
  }
  const s = String(v).trim();
  // dd/mm/yyyy or yyyy-mm-dd or "20-May"
  const m1 = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (m1) { const y = m1[3].length === 2 ? 2000 + Number(m1[3]) : Number(m1[3]); return `${y}-${m1[2].padStart(2, "0")}-${m1[1].padStart(2, "0")}`; }
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  return null;
}
function excelTimeToHHMM(v: any): string | null {
  if (v == null || v === "") return null;
  if (typeof v === "number") {
    const total = Math.round(v * 24 * 60);
    const h = Math.floor(total / 60) % 24, mi = total % 60;
    return `${String(h).padStart(2, "0")}:${String(mi).padStart(2, "0")}`;
  }
  const s = String(v).trim();
  const m = s.match(/(\d{1,2}):(\d{2})/);
  return m ? `${m[1].padStart(2, "0")}:${m[2]}` : null;
}

function parseWorkbook(wb: XLSX.WorkBook): Parsed {
  const out: Parsed = {
    fornecedor_nome: null, data_chegada: null, hora_chegada: null,
    motorista: null, telefone: null, cpf: null, placa: null,
    conferente: null, pallets_quantidade: null, pallets_devolvidos: false,
    itens: [],
  };

  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, raw: true, defval: "" });
    for (let r = 0; r < rows.length; r++) {
      const row = rows[r] || [];
      const joined = row.map((c) => toStr(c)).join(" | ").toUpperCase();

      // Sheet 1: cabeçalho do recibo
      if (joined.includes("FORNECEDOR:") && !out.fornecedor_nome) {
        for (let c = 0; c < row.length; c++) {
          if (toStr(row[c]).toUpperCase().includes("FORNECEDOR:")) {
            for (let k = c + 1; k < row.length; k++) {
              const v = toStr(row[k]); if (v) { out.fornecedor_nome = v; break; }
            }
          }
        }
        // hora costuma estar na mesma linha do cabeçalho — capturar última hora-like
        for (const cell of row) {
          const t = excelTimeToHHMM(cell); if (t && !out.hora_chegada) out.hora_chegada = t;
        }
        // data — última célula tipo data
        for (const cell of row) {
          const d = excelDateToISO(cell); if (d) out.data_chegada = d;
        }
      }

      // Linhas de itens: padrão `<num> | ton | NOTA FISCAL: | <NF> | <preço> | <total>`
      if (joined.includes("NOTA FISCAL:") && row.some((c) => toStr(c).toLowerCase() === "ton")) {
        const peso = toNum(row[0]);
        if (peso > 0) {
          const idxNF = row.findIndex((c) => toStr(c).toUpperCase().includes("NOTA FISCAL"));
          const nf = toStr(row[idxNF + 1] ?? "");
          const preco = toNum(row[idxNF + 2] ?? 35);
          out.itens.push({
            peso_ton: peso,
            nota_fiscal: nf || null,
            valor_unitario: preco || 35,
            nome_produto: "MATÉRIA PRIMA",
          });
        }
      }

      // Sheet 2: anexo
      const label = toStr(row[0]).toUpperCase();
      const value = toStr(row[1] ?? row[2] ?? "");
      if (label === "MOTORISTA:" && value) out.motorista = value;
      if (label === "TELEFONE:" && value) out.telefone = value;
      if (label === "CPF:" && value) out.cpf = value;
      if (label === "PLACA:" && value) out.placa = value.toUpperCase();
      if (label.startsWith("CONFERENTE") && value) out.conferente = value;
      if (label.startsWith("PALETES") || label.startsWith("PALLETS")) {
        const n = toNum(value); if (n) out.pallets_quantidade = n;
      }
      if (label.startsWith("DEVOLVEU PALLETS") || label.startsWith("DEVOLVEU PALETES")) {
        out.pallets_devolvidos = /\(\s*X\s*\)\s*SIM/i.test(value) || /\bSIM\b/i.test(value);
      }
      if (label.startsWith("DATA DE CHEGADA")) { const d = excelDateToISO(row[1]); if (d) out.data_chegada = d; }
      if (label.startsWith("HORA DE CHEGADA")) { const t = excelTimeToHHMM(row[1]); if (t) out.hora_chegada = t; }
      if (label.startsWith("DATA RECEBIMENTO")) { /* opcional */ }

      // Produto nomeado: substitui o nome do último item se houver
      if (label.startsWith("PRODUTO:") && value && out.itens.length > 0) {
        // tenta atribuir a um item sem nome real ainda
        const tgt = out.itens.find((x) => x.nome_produto === "MATÉRIA PRIMA");
        if (tgt) tgt.nome_produto = value;
      }

      // N° Nota explícito na folha de controle: aplica ao primeiro item sem NF
      if (label.startsWith("N° NOTA") || label.startsWith("N. NOTA") || label.startsWith("NO NOTA") || label.startsWith("Nº NOTA")) {
        const nf = toStr(row[1]); if (nf) {
          const tgt = out.itens.find((x) => !x.nota_fiscal); if (tgt) tgt.nota_fiscal = nf;
        }
      }
    }
  }

  return out;
}

export function ImportarRecebimentosMpDialog({ open, onOpenChange }: Props) {
  const [files, setFiles] = useState<File[]>([]);
  const [parsed, setParsed] = useState<Array<{ file: string; data: Parsed }>>([]);
  const [busy, setBusy] = useState(false);
  const qc = useQueryClient();

  async function handleFiles(list: FileList | null) {
    if (!list || !list.length) return;
    const arr = Array.from(list);
    setFiles(arr);
    const out: Array<{ file: string; data: Parsed }> = [];
    for (const f of arr) {
      try {
        const buf = await f.arrayBuffer();
        const wb = XLSX.read(buf, { type: "array", cellDates: false });
        out.push({ file: f.name, data: parseWorkbook(wb) });
      } catch (e: any) {
        toast.error(`Erro ao ler ${f.name}: ${e.message}`);
      }
    }
    setParsed(out);
  }

  async function resolveFornecedorId(nome: string | null): Promise<string | null> {
    if (!nome) return null;
    const { data: existing } = await (supabase as any)
      .from("fornecedores_mp").select("id").ilike("nome", nome).maybeSingle();
    if (existing?.id) return existing.id;
    const { data: created, error } = await (supabase as any)
      .from("fornecedores_mp").insert({ nome }).select("id").single();
    if (error) throw error;
    return created.id;
  }

  async function handleImport() {
    setBusy(true);
    let ok = 0, fail = 0;
    try {
      for (const { data } of parsed) {
        try {
          const fornecedor_id = await resolveFornecedorId(data.fornecedor_nome);
          const { data: u } = await supabase.auth.getUser();
          const peso = data.itens.reduce((a, b) => a + b.peso_ton, 0);
          const valor = data.itens.reduce((a, b) => a + b.peso_ton * b.valor_unitario, 0);
          const { data: novo, error } = await (supabase as any).from("recebimentos_mp").insert({
            data_chegada: data.data_chegada ?? new Date().toISOString().slice(0, 10),
            hora_chegada: data.hora_chegada,
            motorista: data.motorista, telefone: data.telefone, cpf: data.cpf, placa: data.placa,
            fornecedor_id, fornecedor_nome: data.fornecedor_nome,
            conferente: data.conferente,
            pallets_quantidade: data.pallets_quantidade ?? 0,
            pallets_devolvidos: data.pallets_devolvidos,
            peso_total_ton: peso, valor_total: valor,
            status_geral: "aguardando_pagamento",
            criado_por: u.user?.id,
          }).select("id").single();
          if (error) throw error;
          if (data.itens.length) {
            const payload = data.itens.map((it, idx) => ({
              recebimento_id: novo.id,
              nome_produto: it.nome_produto || "MATÉRIA PRIMA",
              nota_fiscal: it.nota_fiscal,
              peso_ton: it.peso_ton,
              valor_unitario: it.valor_unitario || 35,
              ordem: idx,
            }));
            const { error: e2 } = await (supabase as any).from("recebimentos_mp_itens").insert(payload);
            if (e2) throw e2;
          }
          ok++;
        } catch (e: any) { fail++; console.error("Import error:", e); }
      }
      toast.success(`Importação concluída: ${ok} criados${fail ? `, ${fail} falharam` : ""}`);
      qc.invalidateQueries({ queryKey: ["recebimentos_mp"] });
      qc.invalidateQueries({ queryKey: ["fornecedores_mp"] });
      if (fail === 0) { setFiles([]); setParsed([]); onOpenChange(false); }
    } finally { setBusy(false); }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><FileSpreadsheet className="h-5 w-5" /> Importar planilhas de Recebimento</DialogTitle>
          <DialogDescription>
            Selecione uma ou mais planilhas no formato <b>RECIBO_DE_DESCARGA</b> (.xls/.xlsx). Cada arquivo vira um recebimento com seus itens (peso, NF, R$/ton).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label>Planilhas (.xls / .xlsx)</Label>
            <Input type="file" accept=".xls,.xlsx" multiple onChange={(e) => handleFiles(e.target.files)} />
          </div>

          {parsed.length > 0 && (
            <div className="border rounded-md p-3 space-y-3">
              {parsed.map((p, i) => (
                <div key={i} className="text-xs">
                  <div className="font-semibold mb-1">{p.file}</div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-1 text-muted-foreground mb-2">
                    <div><b>Fornecedor:</b> {p.data.fornecedor_nome ?? "—"}</div>
                    <div><b>Data:</b> {p.data.data_chegada ?? "—"}</div>
                    <div><b>Motorista:</b> {p.data.motorista ?? "—"}</div>
                    <div><b>Placa:</b> {p.data.placa ?? "—"}</div>
                  </div>
                  <Table>
                    <TableHeader><TableRow><TableHead>Produto</TableHead><TableHead>NF</TableHead><TableHead className="text-right">Ton</TableHead><TableHead className="text-right">R$/ton</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {p.data.itens.map((it, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{it.nome_produto}</TableCell>
                          <TableCell>{it.nota_fiscal ?? "—"}</TableCell>
                          <TableCell className="text-right">{it.peso_ton.toLocaleString("pt-BR", { minimumFractionDigits: 3 })}</TableCell>
                          <TableCell className="text-right">{it.valor_unitario.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</TableCell>
                          <TableCell className="text-right">{(it.peso_ton * it.valor_unitario).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</TableCell>
                        </TableRow>
                      ))}
                      {p.data.itens.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Nenhum item detectado</TableCell></TableRow>}
                    </TableBody>
                  </Table>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => { setFiles([]); setParsed([]); onOpenChange(false); }}>Cancelar</Button>
          <Button onClick={handleImport} disabled={busy || parsed.length === 0}>
            <Upload className="h-4 w-4 mr-2" /> {busy ? "Importando..." : `Importar ${parsed.length} recebimento(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}