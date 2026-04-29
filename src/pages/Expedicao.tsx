import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Monitor, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMovimentacoes } from "@/hooks/useMovimentacoesPortaria";
import { useVeiculosEsperados } from "@/hooks/useVeiculosEsperados";
import { useCargasFechadasAguardando } from "@/hooks/useCarregamentos";
import { ExpedicaoKpiCards } from "@/components/expedicao/ExpedicaoKpiCards";
import { PainelNoPatio } from "@/components/expedicao/PainelNoPatio";
import { PainelChegou } from "@/components/expedicao/PainelChegou";
import { PainelAChegar } from "@/components/expedicao/PainelAChegar";
import { PainelCargasFechadas } from "@/components/expedicao/PainelCargasFechadas";
import { useQueryClient } from "@tanstack/react-query";

export default function Expedicao() {
  const qc = useQueryClient();
  const [today] = useState(() => new Date());
  const [date, setDate] = useState<Date>(today);
  const dateStr = format(date, "yyyy-MM-dd");
  const hojeStr = format(today, "yyyy-MM-dd");

  const { data: movimentacoesAll = [] } = useMovimentacoes(dateStr, dateStr);
  const { data: veiculosEsperadosAll = [] } = useVeiculosEsperados(dateStr);
  const { data: cargasFechadas = [] } = useCargasFechadasAguardando();

  const movimentacoes = useMemo(
    () => movimentacoesAll.filter((m) => m.categoria === "terceirizado"),
    [movimentacoesAll]
  );
  const veiculosEsperados = useMemo(
    () => veiculosEsperadosAll.filter((v) => v.grupo === "TERCEIRIZADO"),
    [veiculosEsperadosAll]
  );
  const cargasTerc = useMemo(
    () => cargasFechadas.filter((c) => !!c.transportadora),
    [cargasFechadas]
  );

  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") setNow(new Date());
    }, 30_000);
    return () => clearInterval(id);
  }, []);

  const counts = useMemo(() => {
    const noPatio = movimentacoes.filter(
      (m) =>
        m.tipo_movimento === "entrada" &&
        m.horario_entrada &&
        m.etapa_terceirizado !== "finalizado"
    ).length;
    const chegou = movimentacoes.filter(
      (m) =>
        m.tipo_movimento === "entrada" &&
        !m.horario_entrada &&
        (m.etapa_terceirizado === "chegada" || !!m.horario_chegada)
    ).length;
    const aChegar = veiculosEsperados.filter((v) => !v.conferido).length;
    return { noPatio, chegou, aChegar, cargasFechadas: cargasTerc.length };
  }, [movimentacoes, veiculosEsperados, cargasTerc]);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["movimentacoes_portaria"] });
    qc.invalidateQueries({ queryKey: ["veiculos_esperados"] });
    qc.invalidateQueries({ queryKey: ["cargas_fechadas_aguardando"] });
    setNow(new Date());
  };

  const isToday = dateStr === hojeStr;

  return (
    <Layout>
      <main className="space-y-4 p-4 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-foreground flex items-center gap-2">
              <Monitor className="h-5 w-5 sm:h-6 sm:w-6 text-primary shrink-0" />
              <span className="truncate">Visão Expedição — Terceirizado</span>
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">
              Acompanhamento em tempo real do pátio, chegadas, previsões e cargas prontas
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "gap-1.5 text-xs sm:text-sm justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="h-3.5 w-3.5" />
                  {isToday ? "Hoje" : format(date, "dd/MM/yyyy", { locale: ptBR })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => d && setDate(d)}
                  locale={ptBR}
                  className={cn("p-3 pointer-events-auto")}
                />
                <div className="p-2 border-t flex justify-end">
                  <Button variant="ghost" size="sm" className="text-xs" onClick={() => setDate(today)}>
                    Hoje
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
            <Button size="sm" variant="outline" className="gap-1.5 text-xs sm:text-sm" onClick={refresh}>
              <RefreshCw className="h-3.5 w-3.5" /> Atualizar
            </Button>
          </div>
        </div>

        <ExpedicaoKpiCards {...counts} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4">
          <PainelNoPatio movimentacoes={movimentacoes} now={now} />
          <PainelChegou movimentacoes={movimentacoes} now={now} />
          <PainelAChegar veiculos={veiculosEsperados} hoje={hojeStr} />
          <PainelCargasFechadas cargas={cargasTerc} />
        </div>
      </main>
    </Layout>
  );
}
