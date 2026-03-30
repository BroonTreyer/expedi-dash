import { useState, useCallback, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Upload, FileSpreadsheet, AlertTriangle, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import * as XLSX from "xlsx";

interface ParsedRow {
  grupo: string;
  data: string;
  placa: string;
  destino: string;
  carga_id: string;
  peso: number | null;
  qtd_entregas: number | null;
  motorista: string;
  transportadora: string;
  valid: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function parseNum(val: unknown): number | null {
  if (val == null || val === "") return null;
  const n = Number(val);
  return isNaN(n) ? null : n;
}

function parseXlsx(data: ArrayBuffer): ParsedRow[] {
  const wb = XLSX.read(data, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  if (!ws) return [];

  const raw: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
  const rows: ParsedRow[] = [];
  let currentGrupo = "PRÓPRIA";

  for (const row of raw) {
    if (!row || row.length === 0) continue;
    const first = String(row[0] ?? "").trim().toUpperCase();

    // Skip header/total rows
    if (first === "DATA" || first === "TOTAL" || first === "" && row.every((c) => !c)) continue;
    if (first.includes("TOTAL")) continue;

    // Detect group headers
    if (first === "FROTAS" || first === "INTERIOR") {
      currentGrupo = first;
      continue;
    }
    // Also detect if the row is a section header (only first cell has text, rest empty)
    const nonEmpty = row.filter((c) => c != null && String(c).trim() !== "");
    if (nonEmpty.length <= 1 && first.length > 0 && !first.match(/^\d/)) {
      currentGrupo = first;
      continue;
    }

    // Parse data row — expect at least a few columns
    if (row.length < 3) continue;

    const dataVal = String(row[0] ?? "").trim();
    const placa = String(row[1] ?? "").trim().toUpperCase();
    const destino = String(row[2] ?? "").trim();
    const cargaId = String(row[3] ?? "").trim();
    const peso = parseNum(row[4]);
    const qtdEntregas = parseNum(row[5]);
    const motorista = String(row[6] ?? "").trim();
    const transportadora = String(row[7] ?? "").trim();

    // Skip rows that look like sub-headers
    if (placa === "PLACA" || destino === "DESTINO") continue;

    rows.push({
      grupo: currentGrupo,
      data: dataVal,
      placa,
      destino,
      carga_id: cargaId,
      peso,
      qtd_entregas: qtdEntregas,
      motorista,
      transportadora,
      valid: placa.length >= 3,
    });
  }

  return rows;
}

export function ImportarPlanilhaDialog({ open, onOpenChange }: Props) {
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const queryClient = useQueryClient();

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
          toast.error("Nenhum dado encontrado na planilha");
        }
      } catch {
        toast.error("Erro ao ler planilha. Verifique o formato.");
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

  const handleImport = async () => {
    const validRows = rows.filter((r) => r.valid);
    if (validRows.length === 0) return;

    setImporting(true);
    try {
      const now = new Date();
      const records = validRows.map((r) => {
        const isTerceirizado = r.grupo === "FROTAS" || r.grupo === "INTERIOR";
        return {
          tipo_movimento: "entrada" as const,
          categoria: isTerceirizado ? "terceirizado" : "carga_propria",
          placa: r.placa || null,
          motorista: r.motorista || null,
          empresa: r.transportadora || null,
          rota: r.destino || null,
          carga_id: r.carga_id || null,
          peso: r.peso,
          qtd_entregas: r.qtd_entregas,
          data_hora: now.toISOString(),
        };
      });

      const { error } = await supabase.from("movimentacoes_portaria").insert(records);
      if (error) throw error;

      toast.success(`${validRows.length} registros importados com sucesso!`);
      queryClient.invalidateQueries({ queryKey: ["movimentacoes-portaria"] });
      setRows([]);
      setFileName("");
      onOpenChange(false);
    } catch (err: any) {
      toast.error("Erro ao importar: " + (err.message || "Erro desconhecido"));
    } finally {
      setImporting(false);
    }
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
            Faça upload da planilha XLSX para criar entradas automaticamente
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
                    <TableHead className="text-xs">Motorista</TableHead>
                    <TableHead className="text-xs">Transp.</TableHead>
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
                      <TableCell className="text-xs py-1.5">{r.motorista}</TableCell>
                      <TableCell className="text-xs py-1.5">{r.transportadora}</TableCell>
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
            <Button onClick={handleImport} disabled={importing}>
              {importing ? "Importando..." : `Importar ${validCount} registros`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
