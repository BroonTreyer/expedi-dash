import { useState, useCallback, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Upload, FileSpreadsheet, AlertTriangle, Check } from "lucide-react";
import * as XLSX from "xlsx";

export interface ParsedRow {
  grupo: string;
  data: string;
  placa: string;
  destino: string;
  carga_id: string;
  peso: number | null;
  qtd_entregas: number | null;
  motorista: string;
  transportadora: string;
  ajudantes: string;
  tipo_veiculo: string;
  valid: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (rows: ParsedRow[]) => void;
  isImporting?: boolean;
}

function parseNum(val: unknown): number | null {
  if (val == null || val === "") return null;
  const s = String(val).replace(",", ".");
  const n = Number(s);
  return isNaN(n) ? null : n;
}

function formatDateValue(val: unknown): string {
  if (val instanceof Date) {
    const d = val.getDate().toString().padStart(2, "0");
    const m = (val.getMonth() + 1).toString().padStart(2, "0");
    const y = val.getFullYear();
    return `${d}/${m}/${y}`;
  }
  const num = Number(val);
  if (!isNaN(num) && num > 40000 && num < 60000) {
    const dt = new Date((num - 25569) * 86400000);
    const d = dt.getUTCDate().toString().padStart(2, "0");
    const m = (dt.getUTCMonth() + 1).toString().padStart(2, "0");
    const y = dt.getUTCFullYear();
    return `${d}/${m}/${y}`;
  }
  return String(val ?? "").trim();
}

function cleanHeader(s: string): string {
  return s.replace(/[^\w\sÁÉÍÓÚÃÕÊ°]/g, "").trim();
}

function buildColumnMap(row: unknown[]): Map<string, number> | null {
  const headerStr = row.map((c) => cleanHeader(String(c ?? "").trim().toUpperCase()));
  const hasPlaca = headerStr.some((s) => s === "PLACA");
  const hasDestino = headerStr.some((s) => s.includes("DESTINO"));
  if (!hasPlaca || !hasDestino) return null;

  const map = new Map<string, number>();
  headerStr.forEach((s, i) => {
    if (s === "DATA") map.set("DATA", i);
    else if (s === "PLACA") map.set("PLACA", i);
    else if (s.includes("DESTINO")) map.set("DESTINO", i);
    else if (s.includes("CARGA")) map.set("CARGA", i);
    else if (s === "PESO") map.set("PESO", i);
    else if (s.includes("ENTREG")) map.set("ENTREGAS", i);
    else if (s.includes("MOTORISTA")) map.set("MOTORISTA", i);
    else if (s.includes("TRANSP") || s.includes("AJUDANTE")) map.set("TRANSP", i);
    else if (s.includes("VEICULO") || s.includes("VEICULO")) map.set("VEICULO", i);
  });
  return map;
}

function extractDateFromText(text: string): string {
  const match = text.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (match) return `${match[1].padStart(2, "0")}/${match[2].padStart(2, "0")}/${match[3]}`;
  return "";
}

function parseXlsx(data: ArrayBuffer): ParsedRow[] {
  const wb = XLSX.read(data, { type: "array", cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  if (!ws) return [];

  const raw: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "", raw: true });
  const rows: ParsedRow[] = [];
  let currentGrupo = "PRÓPRIA";
  let colMap: Map<string, number> | null = null;
  let fallbackDate = "";

  for (const row of raw) {
    if (!row || row.length === 0) continue;
    const first = String(row[0] ?? "").trim().toUpperCase();

    if (first.includes("TOTAL")) continue;
    if (first === "" && row.every((c) => !c)) continue;

    if (first.includes("DT") && first.includes("ENTREG")) {
      const extracted = extractDateFromText(String(row.find((c) => {
        const v = c instanceof Date ? "date" : String(c ?? "");
        return c instanceof Date || /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}/.test(v);
      }) ?? ""));
      if (!extracted && row.some((c) => c instanceof Date)) {
        const dateCell = row.find((c) => c instanceof Date) as Date;
        fallbackDate = formatDateValue(dateCell);
      } else if (extracted) {
        fallbackDate = extracted;
      }
    }

    if (first === "FROTAS" || first === "INTERIOR") {
      currentGrupo = first;
      colMap = null;
      continue;
    }

    const nonEmpty = row.filter((c) => c != null && String(c).trim() !== "");
    if (nonEmpty.length <= 1 && first.length > 0 && !first.match(/^\d/)) {
      const maybeGroup = first.replace(/[^A-ZÁÉÍÓÚÃÕÊ]/g, "");
      if (maybeGroup.length > 2) {
        currentGrupo = first;
        colMap = null;
      }
      continue;
    }

    const possibleMap = buildColumnMap(row);
    if (possibleMap) {
      colMap = possibleMap;
      continue;
    }

    if (!colMap) continue;
    if (row.length < 3) continue;

    const get = (key: string) => {
      const idx = colMap!.get(key);
      if (idx == null) return "";
      const cellVal = row[idx];
      if (key === "DATA") return formatDateValue(cellVal);
      return String(cellVal ?? "").trim();
    };
    const getNum = (key: string) => {
      const idx = colMap!.get(key);
      return idx != null ? parseNum(row[idx]) : null;
    };

    const placa = get("PLACA").toUpperCase();
    if (placa === "PLACA") continue;

    const dataVal = get("DATA") || fallbackDate;
    const destino = get("DESTINO");
    const cargaId = get("CARGA");
    const peso = getNum("PESO");
    const qtdEntregas = getNum("ENTREGAS");
    const motorista = get("MOTORISTA");
    const transpOrAjudante = get("TRANSP");
    const tipoVeiculo = get("VEICULO");

    const isTerceirizado = currentGrupo === "FROTAS" || currentGrupo === "INTERIOR";

    rows.push({
      grupo: currentGrupo,
      data: dataVal,
      placa,
      destino,
      carga_id: cargaId,
      peso,
      qtd_entregas: qtdEntregas,
      motorista,
      transportadora: isTerceirizado ? transpOrAjudante : "",
      ajudantes: isTerceirizado ? "" : transpOrAjudante,
      tipo_veiculo: tipoVeiculo,
      valid: placa.length >= 3,
    });
  }

  return rows;
}

export function ImportarPlanilhaDialog({ open, onOpenChange, onConfirm, isImporting }: Props) {
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState("");

  const validCount = useMemo(() => rows.filter((r) => r.valid).length, [rows]);

  const handleFile = useCallback((file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = e.target?.result as ArrayBuffer;
      try {
        const parsed = parseXlsx(data);
        setRows(parsed);
        if (parsed.length === 0) {
          import("sonner").then(({ toast }) => toast.error("Nenhum dado encontrado na planilha"));
        }
      } catch {
        import("sonner").then(({ toast }) => toast.error("Erro ao ler planilha. Verifique o formato."));
        setRows([]);
      }
    };
    reader.readAsArrayBuffer(file);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleConfirm = () => {
    const validRows = rows.filter((r) => r.valid);
    if (validRows.length === 0) return;
    onConfirm(validRows);
    setRows([]);
    setFileName("");
    onOpenChange(false);
  };

  const handleClose = (val: boolean) => {
    if (!val) {
      setRows([]);
      setFileName("");
    }
    onOpenChange(val);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Importar Mapa de Carregamento
          </DialogTitle>
          <DialogDescription>
            Faça upload da planilha XLSX para carregar a lista de veículos esperados
          </DialogDescription>
        </DialogHeader>

        {rows.length === 0 ? (
          <div
            className="border-2 border-dashed rounded-lg p-12 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => {
              const input = document.createElement("input");
              input.type = "file";
              input.accept = ".xlsx,.xls";
              input.onchange = (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (file) handleFile(file);
              };
              input.click();
            }}
          >
            <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm font-medium">Arraste a planilha aqui ou clique para selecionar</p>
            <p className="text-xs text-muted-foreground mt-1">Formatos aceitos: .xlsx, .xls</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                📄 {fileName} — {rows.length} linhas encontradas
              </span>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="gap-1">
                  <Check className="h-3 w-3" /> {validCount} válidos
                </Badge>
                {rows.length - validCount > 0 && (
                  <Badge variant="outline" className="gap-1 text-yellow-600 border-yellow-300">
                    <AlertTriangle className="h-3 w-3" /> {rows.length - validCount} incompletos
                  </Badge>
                )}
              </div>
            </div>

            <div className="overflow-auto flex-1 border rounded-md max-h-[50vh]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Grupo</TableHead>
                    <TableHead className="text-xs">Data</TableHead>
                    <TableHead className="text-xs">Placa</TableHead>
                    <TableHead className="text-xs">Destino</TableHead>
                    <TableHead className="text-xs">N° Carga</TableHead>
                    <TableHead className="text-xs text-right">Peso</TableHead>
                    <TableHead className="text-xs text-right">Qt Entr.</TableHead>
                    <TableHead className="text-xs">Tipo Veículo</TableHead>
                    <TableHead className="text-xs">Motorista</TableHead>
                    <TableHead className="text-xs">Transp./Ajud.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r, i) => (
                    <TableRow key={i} className={r.valid ? "" : "bg-yellow-50 dark:bg-yellow-950/20"}>
                      <TableCell className="text-xs py-1.5">{r.grupo}</TableCell>
                      <TableCell className="text-xs py-1.5">{r.data}</TableCell>
                      <TableCell className="text-xs py-1.5 font-mono font-medium">{r.placa || "—"}</TableCell>
                      <TableCell className="text-xs py-1.5">{r.destino}</TableCell>
                      <TableCell className="text-xs py-1.5">{r.carga_id}</TableCell>
                      <TableCell className="text-xs py-1.5 text-right">{r.peso ?? "—"}</TableCell>
                      <TableCell className="text-xs py-1.5 text-right">{r.qtd_entregas ?? "—"}</TableCell>
                      <TableCell className="text-xs py-1.5">{r.tipo_veiculo}</TableCell>
                      <TableCell className="text-xs py-1.5">{r.motorista}</TableCell>
                      <TableCell className="text-xs py-1.5">{r.transportadora || r.ajudantes || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => { setRows([]); setFileName(""); }}>
                Trocar arquivo
              </Button>
            </div>
          </>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => handleClose(false)}>Cancelar</Button>
          {validCount > 0 && (
            <Button onClick={handleConfirm} disabled={isImporting}>
              {isImporting ? "Importando..." : `Carregar ${validCount} veículos esperados`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
