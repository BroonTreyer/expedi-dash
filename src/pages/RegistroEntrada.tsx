import { useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Truck, Building2, LogIn } from "lucide-react";
import { RegistroEntradaDialog } from "@/components/portaria/RegistroEntradaDialog";
import { SolicitacoesPendentesPanel } from "@/components/portaria/SolicitacoesPendentesPanel";
import { CargasFechadasAguardandoPanel } from "@/components/portaria/CargasFechadasAguardandoPanel";

export default function RegistroEntrada() {
  const [grupo, setGrupo] = useState<"PRÓPRIA" | "TERCEIRIZADO" | null>(null);

  return (
    <Layout>
      <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto w-full">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-primary/10 shrink-0">
            <LogIn className="h-6 w-6 text-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight">Registro de Entrada</h1>
            <p className="text-sm text-muted-foreground max-w-2xl">
              Registre a entrada de veículos no pátio. A Logística poderá vincular esses veículos no fechamento de carga.
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
                <p className="text-xs text-muted-foreground mt-1">Registrar entrada de veículo da empresa</p>
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
                <p className="text-xs text-muted-foreground mt-1">Registrar entrada de veículo de transportadora</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <CargasFechadasAguardandoPanel />
        <SolicitacoesPendentesPanel />

        {grupo && (
          <RegistroEntradaDialog
            open={!!grupo}
            onOpenChange={(o) => { if (!o) setGrupo(null); }}
            grupo={grupo}
          />
        )}
      </div>
    </Layout>
  );
}

