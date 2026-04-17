import { useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Truck, Building2, AlertCircle } from "lucide-react";
import { RegistroChegadaWalkInDialog } from "@/components/portaria/RegistroChegadaWalkInDialog";
import { SolicitacoesPendentesPanel } from "@/components/portaria/SolicitacoesPendentesPanel";

export default function ChegadaSemPrevisao() {
  const [grupo, setGrupo] = useState<"PRÓPRIA" | "TERCEIRIZADO" | null>(null);

  return (
    <Layout>
      <div className="space-y-6 max-w-5xl mx-auto">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-950">
            <AlertCircle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Chegada sem previsão</h1>
            <p className="text-sm text-muted-foreground">
              Registre veículos que chegaram sem estar na lista de previstos. A Logística será notificada para autorizar a entrada.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card
            className="cursor-pointer hover:border-primary hover:shadow-md transition-all"
            onClick={() => setGrupo("PRÓPRIA")}
          >
            <CardContent className="p-6 flex flex-col items-center text-center gap-3">
              <div className="p-4 rounded-full bg-primary/10">
                <Truck className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Frota Própria</h3>
                <p className="text-xs text-muted-foreground mt-1">Veículo da empresa que chegou sem previsão</p>
              </div>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover:border-primary hover:shadow-md transition-all"
            onClick={() => setGrupo("TERCEIRIZADO")}
          >
            <CardContent className="p-6 flex flex-col items-center text-center gap-3">
              <div className="p-4 rounded-full bg-primary/10">
                <Building2 className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Terceirizado</h3>
                <p className="text-xs text-muted-foreground mt-1">Veículo de transportadora não prevista</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <SolicitacoesPendentesPanel />

        {grupo && (
          <RegistroChegadaWalkInDialog
            open={!!grupo}
            onOpenChange={(o) => { if (!o) setGrupo(null); }}
            grupo={grupo}
          />
        )}
      </div>
    </Layout>
  );
}
