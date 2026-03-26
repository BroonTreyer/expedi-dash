import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import type { RegistroPortaria } from "@/hooks/useRegistrosPortaria";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  registros: RegistroPortaria[];
}

export function EvidenciasViewer({ open, onOpenChange, registros }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Evidências da Portaria</DialogTitle>
        </DialogHeader>
        {registros.length === 0 && (
          <p className="text-sm text-muted-foreground py-4">Nenhuma evidência registrada.</p>
        )}
        <div className="space-y-6">
          {registros.map((r) => (
            <div key={r.id} className="border border-border rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant={r.tipo_registro === "saida" ? "default" : "secondary"}>
                  {r.tipo_registro === "saida" ? "Saída" : "Retorno"}
                </Badge>
                <Badge variant="outline">{r.status_validacao}</Badge>
                {r.divergencia_placa && <Badge variant="destructive">Divergência placa</Badge>}
                {r.divergencia_km && <Badge variant="destructive">KM suspeito</Badge>}
                <span className="text-xs text-muted-foreground ml-auto">
                  {new Date(r.created_at).toLocaleString("pt-BR")}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {r.foto_placa_url && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Foto da Placa</p>
                    <img src={r.foto_placa_url} alt="Placa" className="rounded-md w-full h-32 object-cover" />
                    <p className="text-xs mt-1">
                      Lido: <strong>{r.texto_placa_lido ?? "—"}</strong> | Confirmado: <strong>{r.placa_confirmada ?? "—"}</strong>
                    </p>
                  </div>
                )}
                {r.foto_km_url && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Foto do KM</p>
                    <img src={r.foto_km_url} alt="KM" className="rounded-md w-full h-32 object-cover" />
                    <p className="text-xs mt-1">
                      Lido: <strong>{r.km_lido ?? "—"}</strong> | Confirmado: <strong>{r.km_confirmado ?? "—"}</strong>
                    </p>
                  </div>
                )}
              </div>

              {r.km_rodado_real !== null && (
                <p className="text-sm">KM rodado: <strong>{r.km_rodado_real} km</strong></p>
              )}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
