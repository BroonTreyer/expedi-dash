import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Truck } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props { carregamentos: any[]; }

const ETAPA_ORDER = ["vendas", "logistica", "carregado"] as const;
const ETAPA_LABEL: Record<string, string> = {
  vendas: "Vendas",
  logistica: "Logística OK",
  carregado: "Carregado",
};

export function CargasAndamentoVendedor({ carregamentos }: Props) {
  // Agrupa por (data, numero_pedido) — um pedido pode ter múltiplos itens
  const pedidos = useMemo(() => {
    const map = new Map<string, any>();
    for (const c of carregamentos) {
      const key = `${c.data}-${c.numero_pedido ?? c.id}`;
      const existing = map.get(key);
      if (existing) {
        existing.peso += Number(c.peso ?? 0);
        existing.itens.push(c);
      } else {
        map.set(key, {
          key,
          data: c.data,
          numero_pedido: c.numero_pedido,
          cliente: c.cliente,
          codigo_cliente: c.codigo_cliente,
          uf: c.uf,
          cidade: c.cidade,
          status: c.status,
          etapa: c.etapa,
          placa: c.placa,
          nome_carga: c.nome_carga,
          peso: Number(c.peso ?? 0),
          itens: [c],
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => (b.data > a.data ? 1 : -1));
  }, [carregamentos]);

  const grupos = ETAPA_ORDER.map((et) => ({
    etapa: et,
    label: ETAPA_LABEL[et],
    items: pedidos.filter((p) => (p.etapa ?? "vendas") === et),
  }));

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Truck className="h-4 w-4" /> Pedidos no período
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {pedidos.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Nenhum pedido no período selecionado.</p>
        ) : grupos.map((g) => (
          <div key={g.etapa}>
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{g.label}</h3>
              <Badge variant="secondary" className="text-[10px]">{g.items.length}</Badge>
            </div>
            {g.items.length === 0 ? (
              <p className="text-xs text-muted-foreground/60 ml-1">—</p>
            ) : (
              <div className="space-y-1.5">
                {g.items.slice(0, 50).map((p) => (
                  <div key={p.key} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-muted/20 px-3 py-2 text-sm">
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="font-medium truncate">{p.cliente ?? "—"}</span>
                      <span className="text-[11px] text-muted-foreground">
                        Pedido #{p.numero_pedido ?? "—"} • {format(new Date(p.data + "T00:00:00"), "dd/MM/yyyy", { locale: ptBR })}
                        {p.cidade ? ` • ${p.cidade}/${p.uf}` : ""}
                        {p.placa ? ` • ${p.placa}` : ""}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-mono">{p.peso.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} kg</span>
                      <Badge variant="outline" className="text-[10px]">{p.status}</Badge>
                    </div>
                  </div>
                ))}
                {g.items.length > 50 && (
                  <p className="text-[11px] text-muted-foreground text-center pt-1">+ {g.items.length - 50} pedidos…</p>
                )}
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}