import { useState } from "react";
import { Layout } from "@/components/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, Truck, Building2 } from "lucide-react";
import { ManualTab } from "@/components/portaria/ManualTab";

export default function PortariaManual() {
  const [tab, setTab] = useState<"carga_propria" | "terceirizado">("carga_propria");

  return (
    <Layout>
      <div className="space-y-4 p-4 md:p-6" data-portaria="true">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <BookOpen className="h-6 w-6 text-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-foreground">Manual da Portaria</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Guia completo, didático e simples de tudo que você pode fazer na Portaria.
            </p>
          </div>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="carga_propria" className="gap-1.5 flex-1 sm:flex-initial text-xs sm:text-sm">
              <Truck className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Varejo
            </TabsTrigger>
            <TabsTrigger value="terceirizado" className="gap-1.5 flex-1 sm:flex-initial text-xs sm:text-sm">
              <Building2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Distribuidores
            </TabsTrigger>
          </TabsList>

          <TabsContent value="carga_propria">
            <ManualTab categoria="carga_propria" />
          </TabsContent>
          <TabsContent value="terceirizado">
            <ManualTab categoria="terceirizado" />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
