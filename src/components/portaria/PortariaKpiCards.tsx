import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, AlertTriangle, PenLine, FileImage } from "lucide-react";
import type { RegistroPortaria } from "@/hooks/useRegistrosPortaria";

interface Props {
  registros: RegistroPortaria[];
}

export function PortariaKpiCards({ registros }: Props) {
  const completos = registros.filter(
    (r) => r.foto_placa_url && r.foto_km_url && r.status_validacao === "confirmada"
  ).length;

  const divergentes = registros.filter(
    (r) => r.divergencia_placa || r.divergencia_km || r.status_validacao === "divergente"
  ).length;

  const correcoes = registros.filter(
    (r) => r.status_validacao === "corrigida" || r.leitura_modo === "manual"
  ).length;

  const totalRegistros = registros.length;

  const cards = [
    { label: "Evidências Completas", value: completos, icon: CheckCircle, color: "text-accent" },
    { label: "Leituras Divergentes", value: divergentes, icon: AlertTriangle, color: "text-destructive" },
    { label: "Correções Manuais", value: correcoes, icon: PenLine, color: "text-primary" },
    { label: "Total de Registros", value: totalRegistros, icon: FileImage, color: "text-muted-foreground" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {cards.map((c) => (
        <Card key={c.label}>
          <CardContent className="p-4 flex items-center gap-3">
            <c.icon className={`h-8 w-8 shrink-0 ${c.color}`} />
            <div>
              <p className="text-2xl font-bold">{c.value}</p>
              <p className="text-xs text-muted-foreground">{c.label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
