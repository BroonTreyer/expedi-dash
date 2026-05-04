import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Truck, Clock, MapPin, Package, Weight } from "lucide-react";
import { useEffect, useState } from "react";
import type { MotoristaAgg } from "@/hooks/useMotoristasPainel";

function formatElapsed(start: string): string {
  const ms = Date.now() - new Date(start).getTime();
  if (ms < 0) return "—";
  const mins = Math.floor(ms / 60000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}min` : `${m}min`;
}

export function EmRotaAgoraPanel({ data, onSelect }: { data: MotoristaAgg[]; onSelect: (m: MotoristaAgg) => void }) {
  const emRota = data.filter((d) => d.em_rota && d.em_rota_desde);
  const [, tick] = useState(0);

  // Atualiza tempo decorrido a cada 30s
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  if (emRota.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-sm text-muted-foreground">
          Nenhum motorista em rota no momento.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {emRota.map((m) => {
        const ativo = m.movimentos.find((i) =>
          // Terceirizado não tem etapa "em_rota"; só Carga Própria modela rota.
          i.etapa_carga_propria === "em_rota" &&
          i.horario_real_saida && !i.horario_real_retorno && !i.horario_saida_final,
        );
        return (
          <Card key={m.nome} className="cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => onSelect(m)}>
            <CardContent className="p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold text-sm truncate">{m.nome}</p>
                <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300">Em rota</Badge>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Truck className="h-3.5 w-3.5" />
                <span>{ativo?.placa || "—"}</span>
                {ativo?.carga_id && <span>· Carga {ativo.carga_id}</span>}
              </div>
              {ativo?.rota && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" />
                  <span className="truncate">{ativo.rota}</span>
                </div>
              )}
              <div className="flex items-center justify-between pt-1.5 border-t border-border">
                <div className="flex items-center gap-1.5 text-xs">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="font-medium tabular-nums">{formatElapsed(m.em_rota_desde!)}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {ativo?.qtd_entregas != null && (
                    <span className="flex items-center gap-1"><Package className="h-3 w-3" />{ativo.qtd_entregas}</span>
                  )}
                  {ativo?.peso != null && (
                    <span className="flex items-center gap-1"><Weight className="h-3 w-3" />{Math.round(Number(ativo.peso))}kg</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
