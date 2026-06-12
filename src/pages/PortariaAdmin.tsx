import { Layout } from "@/components/Layout";
import { Shield } from "lucide-react";
import { PortariaAdminPanel } from "@/components/portaria/PortariaAdminPanel";

export default function PortariaAdmin() {
  return (
    <Layout>
      <div className="space-y-4 p-4 md:p-6 max-w-4xl mx-auto" data-portaria="true">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
            <Shield className="h-6 w-6 text-destructive" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-foreground">Limpeza da Portaria</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Ferramentas de admin para finalizar registros travados e remover previsões vencidas.
            </p>
          </div>
        </div>
        <PortariaAdminPanel />
      </div>
    </Layout>
  );
}