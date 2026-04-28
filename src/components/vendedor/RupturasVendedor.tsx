import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props { carregamentos: any[]; }

export function RupturasVendedor({ carregamentos }: Props) {
  const rupturas = carregamentos.filter((c) => c.ruptura || c.ruptura_sinalizada);

  return (
    <Card className="border-[#EF5350]/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2 text-[#EF5350]">
          <AlertTriangle className="h-4 w-4" /> Minhas Rupturas
          <span className="ml-auto text-xs font-normal text-muted-foreground">{rupturas.length} {rupturas.length === 1 ? "item" : "itens"}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {rupturas.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Nenhuma ruptura no período. ✓</p>
        ) : (
          <div className="space-y-1.5 max-h-80 overflow-auto">
            {rupturas.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-[#EF5350]/5 border border-[#EF5350]/20 px-3 py-2 text-sm">
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="font-medium truncate">{r.nome_produto ?? "—"}</span>
                  <span className="text-[11px] text-muted-foreground">
                    {r.cliente ?? "—"} • Pedido #{r.numero_pedido ?? "—"} • {format(new Date(r.data + "T00:00:00"), "dd/MM/yyyy", { locale: ptBR })}
                  </span>
                </div>
                <span className="text-xs font-mono text-muted-foreground shrink-0">
                  {Number(r.peso ?? 0).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} kg
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}