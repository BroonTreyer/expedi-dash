import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { History, Plus, Pencil, Trash2, User } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useAuditLog, type AuditEntry } from "@/hooks/useAuditLog";

const fieldLabels: Record<string, string> = {
  status: "Status",
  etapa: "Etapa",
  placa: "Placa",
  motorista: "Motorista",
  carga_id: "ID Carga",
  nome_carga: "Nome Carga",
  ruptura: "Ruptura",
  observacoes: "Observações",
  ordem_entrega: "Ordem Entrega",
  transportadora: "Transportadora",
  tipo_caminhao: "Tipo Caminhão",
  horario_inicio: "Hora Início",
  horario_fim: "Hora Fim",
  etapa_terceirizado: "Etapa Terceirizado",
  numero_lacre: "Nº Lacre",
};

const actionConfig = {
  criado: { icon: Plus, label: "Criado", color: "bg-accent text-accent-foreground" },
  alterado: { icon: Pencil, label: "Alterado", color: "bg-blue-500 text-white" },
  excluido: { icon: Trash2, label: "Excluído", color: "bg-destructive text-destructive-foreground" },
} as Record<string, { icon: typeof Plus; label: string; color: string }>;

function ChangeDetails({ changes }: { changes: Record<string, any> }) {
  if (changes.novo) {
    return (
      <p className="text-[11px] text-muted-foreground mt-1">Registro criado</p>
    );
  }
  if (changes.excluido) {
    const info = changes.excluido;
    return (
      <p className="text-[11px] text-muted-foreground mt-1">
        {info.pedido && `Pedido ${info.pedido}`}
        {info.produto && ` - ${info.produto}`}
        {info.tipo && `Tipo: ${info.tipo}`}
        {info.placa && ` | Placa: ${info.placa}`}
      </p>
    );
  }

  const entries = Object.entries(changes);
  if (entries.length === 0) return null;

  return (
    <div className="mt-1.5 space-y-1">
      {entries.map(([field, change]) => {
        const label = fieldLabels[field] || field;
        const de = change?.de ?? "—";
        const para = change?.para ?? "—";
        return (
          <div key={field} className="text-[11px]">
            <span className="text-muted-foreground font-medium">{label}:</span>{" "}
            <span className="text-muted-foreground/70 line-through">{String(de)}</span>
            <span className="text-foreground ml-1">→ {String(para)}</span>
          </div>
        );
      })}
    </div>
  );
}

function TimelineEntry({ entry }: { entry: AuditEntry }) {
  const config = actionConfig[entry.action] || actionConfig.alterado;
  const Icon = config.icon;

  return (
    <div className="flex gap-3 pb-4 relative">
      {/* Vertical line */}
      <div className="absolute left-[13px] top-7 bottom-0 w-px bg-border" />
      {/* Icon dot */}
      <div className={cn("h-7 w-7 rounded-full flex items-center justify-center shrink-0 z-10", config.color)}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="flex-1 min-w-0 pt-0.5">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-[10px] font-normal h-5">
            {config.label}
          </Badge>
          <span className="text-[10px] text-muted-foreground">
            {format(new Date(entry.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
          </span>
        </div>
        {entry.user_email && (
          <div className="flex items-center gap-1 mt-1">
            <User className="h-3 w-3 text-muted-foreground/50" />
            <span className="text-[11px] text-muted-foreground">{entry.user_email}</span>
          </div>
        )}
        <ChangeDetails changes={entry.changes} />
      </div>
    </div>
  );
}

interface Props {
  entityType: string;
  entityId: string;
  title?: string;
  trigger?: React.ReactNode;
}

export function AuditTimeline({ entityType, entityId, title, trigger }: Props) {
  const { data: entries = [], isLoading } = useAuditLog(entityType, entityId);

  return (
    <Sheet>
      <SheetTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
            <History className="h-3.5 w-3.5" />
            Histórico
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 text-base">
            <History className="h-4 w-4" />
            {title || "Histórico de Alterações"}
          </SheetTitle>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-100px)] mt-4 pr-2">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="h-7 w-7 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-40" />
                  </div>
                </div>
              ))}
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-12">
              <History className="h-10 w-10 mx-auto text-muted-foreground/20 mb-3" />
              <p className="text-sm text-muted-foreground">Nenhum registro de alteração</p>
            </div>
          ) : (
            <div className="pl-1">
              {entries.map((entry) => (
                <TimelineEntry key={entry.id} entry={entry} />
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
