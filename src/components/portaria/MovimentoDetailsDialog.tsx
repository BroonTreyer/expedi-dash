import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { MovimentacaoPortaria } from "@/hooks/useMovimentacoesPortaria";
import { CATEGORIAS, SETORES } from "@/hooks/useMovimentacoesPortaria";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  movimento: MovimentacaoPortaria | null;
}

export function MovimentoDetailsDialog({ open, onOpenChange, movimento }: Props) {
  if (!movimento) return null;
  const m = movimento;
  const getCategoriaLabel = (val: string) => CATEGORIAS.find((c) => c.value === val)?.label || val;
  const getSetorLabel = (val: string) => SETORES.find((s) => s.value === val)?.label || val;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalhes do Movimento</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={m.tipo_movimento === "entrada" ? "default" : "secondary"}>
              {m.tipo_movimento === "entrada" ? "Entrada" : "Saída"}
            </Badge>
            <Badge variant="outline">{getCategoriaLabel(m.categoria)}</Badge>
            <span className="text-xs text-muted-foreground ml-auto">
              {format(new Date(m.data_hora), "dd/MM/yyyy HH:mm", { locale: ptBR })}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-muted-foreground">Placa:</span> <strong className="font-mono">{m.placa || "—"}</strong></div>
            <div><span className="text-muted-foreground">Motorista:</span> <strong>{m.motorista || "—"}</strong></div>
            <div><span className="text-muted-foreground">Empresa:</span> <strong>{m.empresa || "—"}</strong></div>
            <div><span className="text-muted-foreground">Setor:</span> <strong>{m.destino_setor ? getSetorLabel(m.destino_setor) : "—"}</strong></div>
            {m.carga_id && <div><span className="text-muted-foreground">Carga:</span> <strong>{m.carga_id}</strong></div>}
            {m.motivo && <div className="col-span-2"><span className="text-muted-foreground">Motivo:</span> <strong>{m.motivo}</strong></div>}
          </div>

          {m.observacoes && (
            <div className="text-sm">
              <span className="text-muted-foreground">Observações:</span>
              <p className="mt-1">{m.observacoes}</p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {m.foto_placa_url && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Foto da Placa</p>
                <img src={m.foto_placa_url} alt="Placa" className="rounded-md w-full h-32 object-cover" />
                {m.texto_placa_lido && (
                  <p className="text-xs mt-1">OCR: <strong>{m.texto_placa_lido}</strong> ({m.confianca_placa}%)</p>
                )}
              </div>
            )}
            {m.foto_documento_url && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Documento/NF</p>
                <img src={m.foto_documento_url} alt="Documento" className="rounded-md w-full h-32 object-cover" />
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
