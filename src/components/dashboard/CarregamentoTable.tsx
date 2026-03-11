import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusSelect } from "./StatusSelect";
import { EtapaBadge } from "./EtapaBadge";
import { StatusBadge } from "./StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Trash2, Edit, ClipboardCheck } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import type { Carregamento } from "@/hooks/useCarregamentos";
import type { AppRole } from "@/hooks/useAuth";

interface Props {
  data: Carregamento[];
  onStatusChange: (id: string, status: string) => void;
  onEdit: (c: Carregamento) => void;
  onDelete: (id: string) => void;
  onComplete: (c: Carregamento) => void;
  userRole?: AppRole | null;
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

function MobileCardView({ data, onStatusChange, onEdit, onDelete, onComplete, userRole }: Props) {
  const isAdmin = userRole === "admin";
  const isLogistica = userRole === "logistica";
  const canChangeStatus = isAdmin || isLogistica;

  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhum carregamento encontrado
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {data.map((c) => (
        <Card key={c.id} className="border-border/60">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <EtapaBadge etapa={c.etapa} />
                <StatusBadge status={c.status} />
              </div>
              {(isAdmin || isLogistica) && (
                <div className="flex gap-1 shrink-0">
                  {c.etapa === "vendas" && (
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-amber-600" title="Completar logística" onClick={() => onComplete(c)}>
                      <ClipboardCheck className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {isAdmin && (
                    <>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(c)}>
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDelete(c.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="font-medium text-sm">{c.nome_produto || c.codigo_produto || "Sem produto"}</div>
              <div className="text-xs text-muted-foreground">{c.vendedores?.nome_vendedor ?? "—"}</div>
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              <div className="text-muted-foreground">Qtd / Peso</div>
              <div className="font-medium">{c.quantidade ?? 0} un / {(c.peso ?? 0).toLocaleString("pt-BR")} kg</div>
              <div className="text-muted-foreground">Caminhão</div>
              <div>{c.tipo_caminhao || <span className="text-muted-foreground/60 italic">Pendente</span>}</div>
              <div className="text-muted-foreground">Placa</div>
              <div className="font-mono uppercase">{c.placa || <span className="text-muted-foreground/60 italic font-sans normal-case">Pendente</span>}</div>
              <div className="text-muted-foreground">Motorista</div>
              <div>{c.motorista || <span className="text-muted-foreground/60 italic">Pendente</span>}</div>
              <div className="text-muted-foreground">UF</div>
              <div>{c.uf ?? "—"}</div>
              <div className="text-muted-foreground">Previsto</div>
              <div>{formatTime(c.horario_previsto)}</div>
            </div>

            {canChangeStatus && (
              <div className="pt-1 border-t border-border">
                <StatusSelect value={c.status} onChange={(s) => onStatusChange(c.id, s)} />
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function CarregamentoTable({ data, onStatusChange, onEdit, onDelete, onComplete, userRole }: Props) {
  const isMobile = useIsMobile();
  const isAdmin = userRole === "admin";
  const isLogistica = userRole === "logistica";
  const canChangeStatus = isAdmin || isLogistica;

  if (isMobile) {
    return <MobileCardView data={data} onStatusChange={onStatusChange} onEdit={onEdit} onDelete={onDelete} onComplete={onComplete} userRole={userRole} />;
  }

  return (
    <div className="rounded-lg border border-border bg-card overflow-x-auto">
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
            {(isAdmin || isLogistica) && <TableHead className="w-[110px]"></TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 && (
            <TableRow>
              <TableCell colSpan={isAdmin || isLogistica ? 16 : 15} className="text-center py-8 text-muted-foreground">
                Nenhum carregamento encontrado
              </TableCell>
            </TableRow>
          )}
          {data.map((c) => (
            <TableRow key={c.id} className="hover:bg-muted/30">
              <TableCell><EtapaBadge etapa={c.etapa} /></TableCell>
              <TableCell>
                {canChangeStatus ? (
                  <StatusSelect value={c.status} onChange={(s) => onStatusChange(c.id, s)} />
                ) : (
                  <span className="text-sm">{c.status}</span>
                )}
              </TableCell>
              <TableCell className="text-sm">{c.vendedores?.nome_vendedor ?? "—"}</TableCell>
              <TableCell className="text-sm font-mono">{c.codigo_produto ?? "—"}</TableCell>
              <TableCell className="text-sm">{c.nome_produto ?? "—"}</TableCell>
              <TableCell className="text-sm text-right">{c.quantidade ?? 0}</TableCell>
              <TableCell className="text-sm text-right font-medium">{(c.peso ?? 0).toLocaleString("pt-BR")}</TableCell>
              <TableCell><PendingCell value={c.tipo_caminhao} /></TableCell>
              <TableCell><PendingCell value={c.placa} /></TableCell>
              <TableCell><PendingCell value={c.motorista} /></TableCell>
              <TableCell className="text-sm">{c.uf ?? "—"}</TableCell>
              <TableCell className="text-sm">{formatTime(c.horario_previsto)}</TableCell>
              <TableCell className="text-sm">{formatTime(c.horario_inicio)}</TableCell>
              <TableCell className="text-sm">{formatTime(c.horario_fim)}</TableCell>
              <TableCell className="text-sm max-w-[120px] truncate" title={c.observacoes ?? ""}>
                {c.observacoes || "—"}
              </TableCell>
              {(isAdmin || isLogistica) && (
                <TableCell>
                  <div className="flex gap-1">
                    {(isAdmin || isLogistica) && c.etapa === "vendas" && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-amber-600" title="Completar logística" onClick={() => onComplete(c)}>
                        <ClipboardCheck className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {isAdmin && (
                      <>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(c)}>
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDelete(c.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
