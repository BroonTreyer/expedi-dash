import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Download, Search, History, Loader2, Trash2, Plus, Pencil, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

const ENTITY_LABELS: Record<string, string> = {
  carregamento: "Carregamento",
  movimentacao: "Movimentação Portaria",
  cliente: "Cliente",
  produto: "Produto",
  motorista: "Motorista",
  caminhao: "Caminhão",
  vendedor: "Vendedor",
  veiculo_esperado: "Veículo Esperado",
  backup: "Backup",
};

const ACTION_CONFIG: Record<string, { label: string; icon: any; className: string }> = {
  criado: { label: "Criado", icon: Plus, className: "bg-emerald-500 text-white hover:bg-emerald-500" },
  alterado: { label: "Alterado", icon: Pencil, className: "bg-blue-500 text-white hover:bg-blue-500" },
  excluido: { label: "Excluído", icon: Trash2, className: "bg-destructive text-destructive-foreground hover:bg-destructive" },
  restaurado: { label: "Restaurado", icon: RotateCcw, className: "bg-amber-500 text-white hover:bg-amber-500" },
  wipe_orders: { label: "Wipe", icon: Trash2, className: "bg-destructive text-destructive-foreground hover:bg-destructive" },
  restore: { label: "Restore", icon: RotateCcw, className: "bg-amber-500 text-white hover:bg-amber-500" },
};

interface AuditEntry {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  user_id: string | null;
  user_email: string | null;
  changes: Record<string, any>;
  created_at: string;
  operation_id?: string | null;
  logical_entity_type?: string | null;
  logical_entity_id?: string | null;
}

function summarizeChanges(entry: AuditEntry): string {
  const c = entry.changes || {};
  if (c.excluido) {
    const e = c.excluido;
    const parts: string[] = [];
    if (e.pedido) parts.push(`Pedido ${e.pedido}`);
    if (e.produto) parts.push(e.produto);
    if (e.cliente) parts.push(e.cliente);
    if (e.placa) parts.push(`Placa ${e.placa}`);
    if (e.tipo) parts.push(e.tipo);
    if (e.nome) parts.push(e.nome);
    if (e.codigo) parts.push(`Cód. ${e.codigo}`);
    if (e.motorista) parts.push(e.motorista);
    return parts.join(" · ") || "Excluído";
  }
  if (c.novo) return "Registro criado";
  if (c.restored_from_log) return `Restaurado a partir do log ${String(c.restored_from_log).slice(0, 8)}…`;
  const fields = Object.keys(c).filter((k) => c[k]?.de !== undefined);
  if (fields.length === 0) return "—";
  return fields.slice(0, 3).join(", ") + (fields.length > 3 ? "…" : "");
}

/**
 * Chave de agrupamento lógico para detectar "uma ação em lote".
 * Agrupa por: usuário + ação + entidade + diff dos campos (changes) + janela de tempo de 2s.
 * Quando existir, prioriza operation_id (futuro) ou logical_entity_id.
 */
function groupKey(e: AuditEntry): string {
  if (e.operation_id) return `op:${e.operation_id}`;
  // Para "alterado": chave inclui o conteúdo do diff (de→para) — assim,
  // mudanças idênticas no mesmo segundo viram 1 grupo.
  // Para "criado"/"excluido": agrupa por janela de 2s, mesmo usuário+entidade.
  const bucket = Math.floor(new Date(e.created_at).getTime() / 2000);
  let diffSig = "";
  if (e.action === "alterado") {
    const c = e.changes || {};
    diffSig = Object.keys(c)
      .filter((k) => c[k]?.de !== undefined)
      .sort()
      .map((k) => `${k}:${JSON.stringify(c[k]?.de)}>${JSON.stringify(c[k]?.para)}`)
      .join("|");
  } else {
    diffSig = e.action;
  }
  return `${e.user_email ?? "?"}::${e.entity_type}::${e.action}::${bucket}::${diffSig}`;
}

interface AuditGroup {
  key: string;
  entries: AuditEntry[];
  representative: AuditEntry;
  count: number;
  cargaIds: string[];
  pedidos: string[];
  clientes: string[];
}

function buildGroups(entries: AuditEntry[]): AuditGroup[] {
  const map = new Map<string, AuditGroup>();
  for (const e of entries) {
    const k = groupKey(e);
    let g = map.get(k);
    if (!g) {
      g = { key: k, entries: [], representative: e, count: 0, cargaIds: [], pedidos: [], clientes: [] };
      map.set(k, g);
    }
    g.entries.push(e);
    g.count++;
    // Tentar inferir identificadores lógicos do snapshot/changes
    const c = e.changes || {};
    const row = c.deleted_row || c.novo || {};
    const cargaId = e.logical_entity_id || row.carga_id || row.nome_carga;
    if (cargaId && !g.cargaIds.includes(cargaId)) g.cargaIds.push(cargaId);
    const pedido = row.numero_pedido;
    if (pedido && !g.pedidos.includes(String(pedido))) g.pedidos.push(String(pedido));
    const cliente = row.cliente;
    if (cliente && !g.clientes.includes(cliente)) g.clientes.push(cliente);
  }
  return Array.from(map.values()).sort(
    (a, b) => new Date(b.representative.created_at).getTime() - new Date(a.representative.created_at).getTime()
  );
}

function ChangeJsonView({ changes }: { changes: Record<string, any> }) {
  const entries = Object.entries(changes || {}).filter(([k]) => k !== "deleted_row");
  if (entries.length === 0 && !changes.deleted_row) return <p className="text-xs text-muted-foreground">Sem detalhes</p>;
  return (
    <div className="space-y-2">
      {entries.map(([field, val]: any) => {
        if (val && typeof val === "object" && "de" in val && "para" in val) {
          return (
            <div key={field} className="text-xs">
              <span className="font-medium">{field}:</span>{" "}
              <span className="line-through text-muted-foreground">{String(val.de ?? "—")}</span>
              {" → "}
              <span className="text-foreground">{String(val.para ?? "—")}</span>
            </div>
          );
        }
        return (
          <div key={field} className="text-xs">
            <span className="font-medium">{field}:</span>{" "}
            <code className="text-[11px] bg-muted px-1 py-0.5 rounded">{JSON.stringify(val)}</code>
          </div>
        );
      })}
      {changes.deleted_row && (
        <details className="text-xs">
          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Ver registro completo (snapshot)</summary>
          <pre className="mt-2 p-2 bg-muted rounded text-[10px] overflow-auto max-h-64">
            {JSON.stringify(changes.deleted_row, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}

function GroupRow({ group }: { group: AuditGroup }) {
  const [open, setOpen] = useState(false);
  const rep = group.representative;
  const cfg = ACTION_CONFIG[rep.action] ?? { label: rep.action, icon: History, className: "bg-muted text-foreground" };
  const Icon = cfg.icon;
  const isGrouped = group.count > 1;

  // Identificador lógico amigável
  const logicalId =
    group.cargaIds[0] ||
    (group.pedidos.length > 0 ? `Pedido ${group.pedidos[0]}${group.pedidos.length > 1 ? ` +${group.pedidos.length - 1}` : ""}` : "") ||
    group.clientes[0] ||
    `${rep.entity_id.slice(0, 8)}…`;

  return (
    <>
      <TableRow className="cursor-pointer hover:bg-muted/30" onClick={() => setOpen((o) => !o)}>
        <TableCell className="text-xs whitespace-nowrap">
          {format(new Date(rep.created_at), "dd/MM/yy HH:mm:ss", { locale: ptBR })}
        </TableCell>
        <TableCell className="text-xs">{rep.user_email || "—"}</TableCell>
        <TableCell>
          <Badge className={cn("text-[10px] gap-1", cfg.className)}>
            <Icon className="h-3 w-3" />
            {cfg.label}
          </Badge>
        </TableCell>
        <TableCell className="text-xs">{ENTITY_LABELS[rep.entity_type] ?? rep.entity_type}</TableCell>
        <TableCell className="text-xs">
          <span className="font-medium">{logicalId}</span>
          {isGrouped && (
            <Badge variant="secondary" className="ml-2 text-[10px] h-5">
              {group.count} itens
            </Badge>
          )}
        </TableCell>
        <TableCell className="text-xs">{summarizeChanges(rep)}</TableCell>
        <TableCell className="w-8">
          <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
        </TableCell>
      </TableRow>
      {open && (
        <TableRow>
          <TableCell colSpan={7} className="bg-muted/30">
            <div className="space-y-3">
              <ChangeJsonView changes={rep.changes} />
              {isGrouped && (
                <details className="text-xs">
                  <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                    Ver {group.count} IDs afetados
                  </summary>
                  <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1 font-mono text-[10px]">
                    {group.entries.map((e) => (
                      <div key={e.id} className="text-muted-foreground truncate" title={e.entity_id}>
                        {e.entity_id.slice(0, 8)}…
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

export default function Logs() {
  const [dataInicio, setDataInicio] = useState(format(subDays(new Date(), 7), "yyyy-MM-dd"));
  const [dataFim, setDataFim] = useState(format(new Date(), "yyyy-MM-dd"));
  const [entidade, setEntidade] = useState<string>("todas");
  const [acao, setAcao] = useState<string>("todas");
  const [busca, setBusca] = useState("");
  const [limit, setLimit] = useState(100);

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["audit_logs", dataInicio, dataFim, entidade, acao, limit],
    queryFn: async () => {
      let q = supabase
        .from("audit_log")
        .select("*")
        .gte("created_at", `${dataInicio}T00:00:00`)
        .lte("created_at", `${dataFim}T23:59:59`)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (entidade !== "todas") q = q.eq("entity_type", entidade);
      if (acao !== "todas") q = q.eq("action", acao);
      const { data, error } = await q;
      if (error) throw error;
      return data as AuditEntry[];
    },
  });

  const filtered = useMemo(() => {
    if (!busca.trim()) return entries;
    const term = busca.toLowerCase();
    return entries.filter((e) => {
      const blob = JSON.stringify(e).toLowerCase();
      return blob.includes(term);
    });
  }, [entries, busca]);

  const groups = useMemo(() => buildGroups(filtered), [filtered]);

  const kpis = useMemo(() => {
    const total = filtered.length;
    const exclusoes = filtered.filter((e) => e.action === "excluido").length;
    const usuariosAtivos = new Set(filtered.map((e) => e.user_email).filter(Boolean)).size;
    const porUsuario = new Map<string, number>();
    filtered.forEach((e) => {
      const u = e.user_email || "—";
      porUsuario.set(u, (porUsuario.get(u) || 0) + 1);
    });
    const top = Array.from(porUsuario.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
    return { total, exclusoes, usuariosAtivos, top };
  }, [filtered]);

  const exportCsv = () => {
    const header = ["data_hora", "usuario", "acao", "entidade", "entity_id", "resumo", "changes_json"];
    const rows = filtered.map((e) => [
      format(new Date(e.created_at), "yyyy-MM-dd HH:mm:ss"),
      e.user_email ?? "",
      e.action,
      ENTITY_LABELS[e.entity_type] ?? e.entity_type,
      e.entity_id,
      summarizeChanges(e).replace(/"/g, "'"),
      JSON.stringify(e.changes).replace(/"/g, "'"),
    ]);
    const csv = [header, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `logs_auditoria_${dataInicio}_a_${dataFim}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Layout>
      <div className="p-4 md:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <History className="h-6 w-6" /> Logs de Auditoria
            </h1>
            <p className="text-sm text-muted-foreground">Tudo que foi criado, alterado ou excluído no sistema</p>
          </div>
          <Button onClick={exportCsv} variant="outline" size="sm" disabled={filtered.length === 0}>
            <Download className="h-4 w-4 mr-2" /> Exportar CSV
          </Button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">Total de eventos</p>
            <p className="text-2xl font-bold">{kpis.total}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">Exclusões</p>
            <p className="text-2xl font-bold text-destructive">{kpis.exclusoes}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">Usuários ativos</p>
            <p className="text-2xl font-bold">{kpis.usuariosAtivos}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Top 5 usuários</p>
            <div className="space-y-0.5">
              {kpis.top.length === 0 && <p className="text-xs text-muted-foreground">—</p>}
              {kpis.top.map(([email, count]) => (
                <div key={email} className="flex justify-between text-[11px]">
                  <span className="truncate mr-2">{email}</span>
                  <span className="font-mono font-semibold">{count}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Filtros */}
        <Card className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div>
              <Label className="text-xs">Data início</Label>
              <Input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className="h-9" />
            </div>
            <div>
              <Label className="text-xs">Data fim</Label>
              <Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="h-9" />
            </div>
            <div>
              <Label className="text-xs">Entidade</Label>
              <Select value={entidade} onValueChange={setEntidade}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  {Object.entries(ENTITY_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Ação</Label>
              <Select value={acao} onValueChange={setAcao}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  <SelectItem value="criado">Criado</SelectItem>
                  <SelectItem value="alterado">Alterado</SelectItem>
                  <SelectItem value="excluido">Excluído</SelectItem>
                  <SelectItem value="restaurado">Restaurado</SelectItem>
                  <SelectItem value="wipe_orders">Wipe</SelectItem>
                  <SelectItem value="restore">Restore Snapshot</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Busca livre</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="placa, pedido, email..." className="h-9 pl-8" />
              </div>
            </div>
          </div>
        </Card>

        {/* Tabela */}
        <Card className="p-0 overflow-hidden">
          {isLoading ? (
            <div className="py-12 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : groups.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Nenhum evento encontrado no período/filtros selecionados.
            </div>
          ) : (
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="text-xs">Data/Hora</TableHead>
                    <TableHead className="text-xs">Usuário</TableHead>
                    <TableHead className="text-xs">Ação</TableHead>
                    <TableHead className="text-xs">Entidade</TableHead>
                    <TableHead className="text-xs">Identificador / Itens</TableHead>
                    <TableHead className="text-xs">Resumo</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groups.map((g) => <GroupRow key={g.key} group={g} />)}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>

        {entries.length === limit && (
          <div className="flex justify-center">
            <Button variant="outline" size="sm" onClick={() => setLimit((l) => l + 100)}>
              Carregar mais 100
            </Button>
          </div>
        )}
      </div>
    </Layout>
  );
}