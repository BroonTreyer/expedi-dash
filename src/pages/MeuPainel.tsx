import { useState } from "react";
import { Layout } from "@/components/Layout";
import { useMeuPainel } from "@/hooks/useMeuPainel";
import { KpiVendedor } from "@/components/vendedor/KpiVendedor";
import { CargasAndamentoVendedor } from "@/components/vendedor/CargasAndamentoVendedor";
import { GraficosVendedor } from "@/components/vendedor/GraficosVendedor";
import { RupturasVendedor } from "@/components/vendedor/RupturasVendedor";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Loader2, User } from "lucide-react";
import { format, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";

const today = new Date();
const last7 = (() => { const d = new Date(); d.setDate(d.getDate() - 6); return d; })();

export default function MeuPainel() {
  const [dateRange, setDateRange] = useState<DateRange>({ from: last7, to: today });
  const { data, isLoading } = useMeuPainel(dateRange);

  const carregamentos = data?.carregamentos ?? [];

  return (
    <Layout>
      <div className="p-4 md:p-6 space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2">
              <User className="h-5 w-5 text-muted-foreground" /> Meu Painel
            </h1>
            <p className="text-sm text-muted-foreground">
              {data?.vendedorNome ? `Olá, ${data.vendedorNome}` : "Visão pessoal de vendas e expedição"}
            </p>
          </div>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn("h-9 gap-1.5 text-sm justify-start font-normal min-w-[200px]", !dateRange.from && "text-muted-foreground")}>
                <CalendarIcon className="h-4 w-4" />
                {dateRange.from ? (
                  dateRange.to && dateRange.from.getTime() !== dateRange.to.getTime()
                    ? `${format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })} – ${format(dateRange.to, "dd/MM/yyyy", { locale: ptBR })}`
                    : format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })
                ) : "Selecionar período"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar mode="range" selected={dateRange} onSelect={(r) => r && setDateRange(r)} locale={ptBR} numberOfMonths={2} className="p-3 pointer-events-auto" />
              <div className="p-2 border-t flex justify-end gap-1 flex-wrap">
                <Button variant="ghost" size="sm" className="text-xs" onClick={() => setDateRange({ from: today, to: today })}>Hoje</Button>
                <Button variant="ghost" size="sm" className="text-xs" onClick={() => { const d = new Date(); d.setDate(d.getDate() - 6); setDateRange({ from: d, to: today }); }}>Últimos 7 dias</Button>
                <Button variant="ghost" size="sm" className="text-xs" onClick={() => setDateRange({ from: startOfMonth(today), to: today })}>Este mês</Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Carregando seus dados...</p>
          </div>
        ) : !data?.vendedorId ? (
          <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
            <p className="text-sm">Sua conta ainda não está vinculada a um cadastro de vendedor.</p>
            <p className="text-xs mt-1">Solicite ao administrador para concluir o vínculo.</p>
          </div>
        ) : (
          <>
            <KpiVendedor carregamentos={carregamentos} />
            <GraficosVendedor carregamentos={carregamentos} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <CargasAndamentoVendedor carregamentos={carregamentos} />
              <RupturasVendedor carregamentos={carregamentos} />
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}