import { useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, Trash2, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useClientes } from "@/hooks/useClientes";
import { normalizeCep, ufFromCep } from "@/lib/cep-uf";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Row = {
  uid: string;
  fileName: string;
  status: "ok" | "erro";
  errorMsg?: string;
  codigo: string;
  nome: string;
  cidade: string;
  uf: string;
  cep: string;
  telefone: string;
  email: string;
  cnpj: string;
};

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const result = r.result as string;
      resolve(result.split(",")[1] ?? "");
    };
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });

export function ImportarClientesPdfDialog({ open, onOpenChange }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [extracting, setExtracting] = useState(false);
  const [saving, setSaving] = useState(false);
  const qc = useQueryClient();
  const { data: clientesExistentes = [] } = useClientes();

  const codigosExistentes = new Set(
    clientesExistentes.map((c: any) => String(c.codigo_cliente || "").trim())
  );

  const reset = () => {
    setRows([]);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    if (files.length > 10) {
      toast.error("Máximo 10 PDFs por vez");
      return;
    }
    setExtracting(true);
    const tId = toast.loading(`Extraindo dados (0/${files.length})...`);
    const novos: Row[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      toast.loading(`Extraindo dados (${i + 1}/${files.length})...`, { id: tId });
      const uid = `${Date.now()}-${i}`;
      try {
        if (file.size > 10 * 1024 * 1024) throw new Error("Arquivo > 10MB");
        const base64 = await fileToBase64(file);
        const { data, error } = await supabase.functions.invoke("parse-cliente-pdf", {
          body: { fileBase64: base64, fileName: file.name },
        });
        if (error) throw error;
        const d = data?.data ?? {};
        const cep = normalizeCep(d.cep || "");
        let uf = String(d.uf || "").toUpperCase().slice(0, 2);
        if (!uf && cep) uf = ufFromCep(cep) || "";
        novos.push({
          uid,
          fileName: file.name,
          status: "ok",
          codigo: String(d.cnpj || "").replace(/\D/g, ""),
          nome: String(d.razao_social || d.nome_fantasia || "").trim(),
          cidade: String(d.cidade || "").trim(),
          uf,
          cep,
          telefone: String(d.telefone || "").replace(/\D/g, ""),
          email: String(d.email || "").trim(),
          cnpj: String(d.cnpj || "").replace(/\D/g, ""),
        });
      } catch (err: any) {
        novos.push({
          uid,
          fileName: file.name,
          status: "erro",
          errorMsg: err?.message || "Falha na extração",
          codigo: "", nome: "", cidade: "", uf: "", cep: "", telefone: "", email: "", cnpj: "",
        });
      }
    }
    toast.success(`${novos.filter(r => r.status === "ok").length} extraído(s) com sucesso`, { id: tId });
    setRows(prev => [...prev, ...novos]);
    setExtracting(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const updateRow = (uid: string, patch: Partial<Row>) => {
    setRows(prev => prev.map(r => (r.uid === uid ? { ...r, ...patch } : r)));
  };

  const removeRow = (uid: string) => {
    setRows(prev => prev.filter(r => r.uid !== uid));
  };

  const codigosNoLote = rows.map(r => r.codigo.trim()).filter(Boolean);
  const isDuplicadoLote = (cod: string) => codigosNoLote.filter(c => c === cod).length > 1;

  const linhasValidas = rows.filter(
    r => r.status === "ok" && r.codigo.trim() && r.nome.trim() && !isDuplicadoLote(r.codigo.trim())
  );

  const handleSalvar = async () => {
    if (linhasValidas.length === 0) {
      toast.error("Nenhuma linha válida para salvar");
      return;
    }
    setSaving(true);
    try {
      const payload = linhasValidas.map(r => ({
        codigo_cliente: r.codigo.trim(),
        nome_cliente: r.nome.trim(),
        cidade: r.cidade.trim() || null,
        uf: r.uf.trim().toUpperCase().slice(0, 2) || null,
        cep: normalizeCep(r.cep) || null,
        ativo: true,
      }));
      const { error } = await supabase
        .from("clientes")
        .upsert(payload, { onConflict: "codigo_cliente" } as any);
      if (error) throw error;

      // Sincronizar pedidos existentes
      try {
        await supabase.rpc("sync_clients_to_orders");
      } catch {}

      toast.success(`${payload.length} cliente(s) salvos com sucesso`);
      qc.invalidateQueries({ queryKey: ["clientes"] });
      qc.invalidateQueries({ queryKey: ["carregamentos"] });
      reset();
      onOpenChange(false);
    } catch (err: any) {
      toast.error("Erro ao salvar: " + (err?.message || err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar Clientes via PDF</DialogTitle>
          <DialogDescription>
            Envie PDFs (pedidos, propostas, fichas cadastrais) e a IA extrairá os dados do cliente. Revise antes de salvar.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf"
            multiple
            className="hidden"
            onChange={handleFiles}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileRef.current?.click()}
            disabled={extracting || saving}
          >
            {extracting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
            {extracting ? "Extraindo..." : "Selecionar PDFs"}
          </Button>
          <span className="text-xs text-muted-foreground">Até 10 arquivos, máx. 10MB cada</span>
        </div>

        {rows.length > 0 && (
          <div className="border rounded-md overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">Status</TableHead>
                  <TableHead className="min-w-40">Código *</TableHead>
                  <TableHead className="min-w-56">Nome *</TableHead>
                  <TableHead className="min-w-40">Cidade</TableHead>
                  <TableHead className="w-20">UF</TableHead>
                  <TableHead className="w-32">CEP</TableHead>
                  <TableHead className="min-w-40">Arquivo</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(r => {
                  const cod = r.codigo.trim();
                  const dupBd = cod && codigosExistentes.has(cod);
                  const dupLote = cod && isDuplicadoLote(cod);
                  return (
                    <TableRow key={r.uid}>
                      <TableCell>
                        {r.status === "erro" ? (
                          <Badge variant="destructive" title={r.errorMsg}>Erro</Badge>
                        ) : dupLote ? (
                          <Badge variant="destructive">Repetido</Badge>
                        ) : dupBd ? (
                          <Badge variant="secondary">Já existe</Badge>
                        ) : (
                          <Badge>OK</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Input
                          value={r.codigo}
                          onChange={e => updateRow(r.uid, { codigo: e.target.value })}
                          placeholder="Código"
                          className="h-8"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={r.nome}
                          onChange={e => updateRow(r.uid, { nome: e.target.value })}
                          placeholder="Razão social"
                          className="h-8"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={r.cidade}
                          onChange={e => updateRow(r.uid, { cidade: e.target.value })}
                          className="h-8"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={r.uf}
                          onChange={e => updateRow(r.uid, { uf: e.target.value.toUpperCase().slice(0, 2) })}
                          maxLength={2}
                          className="h-8 uppercase"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={r.cep}
                          onChange={e => updateRow(r.uid, { cep: e.target.value })}
                          className="h-8"
                        />
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground truncate max-w-40" title={r.fileName}>
                        <FileText className="h-3 w-3 inline mr-1" />{r.fileName}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => removeRow(r.uid)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        <DialogFooter>
          <div className="flex-1 text-sm text-muted-foreground">
            {rows.length > 0 && (
              <>
                {linhasValidas.length} válida(s) de {rows.length}
              </>
            )}
          </div>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSalvar} disabled={saving || extracting || linhasValidas.length === 0}>
            {saving ? "Salvando..." : `Salvar ${linhasValidas.length || ""}`.trim()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}