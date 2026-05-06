import { useEffect, useMemo, useState } from "react";
import { format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Monitor, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMovimentacoes } from "@/hooks/useMovimentacoesPortaria";
import { useVeiculosEsperados } from "@/hooks/useVeiculosEsperados";
import { usePesoPorCarga } from "@/hooks/usePesoPorCarga";
import { useCargasDiaExpedicao } from "@/hooks/useCargasDiaExpedicao";
import { useStatusPortariaPorCarga } from "@/hooks/useStatusPortariaPorCarga";
import { ExpedicaoKpiCards } from "@/components/expedicao/ExpedicaoKpiCards";
import { PainelNoPatio } from "@/components/expedicao/PainelNoPatio";
import { PainelChegou } from "@/components/expedicao/PainelChegou";
import { PainelAChegar } from "@/components/expedicao/PainelAChegar";
import { PainelCargasFechadas } from "@/components/expedicao/PainelCargasFechadas";
import { useQueryClient } from "@tanstack/react-query";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export default function Expedicao() {
  const qc = useQueryClient();
  const [today] = useState(() => new Date());
  const [date, setDate] = useState<Date>(today);
  const dateStr = format(date, "yyyy-MM-dd");
  const hojeStr = format(today, "yyyy-MM-dd");

  // Janela alargada: incluir chegadas em aberto dos últimos 2 dias para que
  // motoristas que chegaram ontem (sem terem saído) apareçam corretamente
  // em "Chegou — aguardando liberação" / "No Pátio".
  const dateFromStr = format(subDays(date, 2), "yyyy-MM-dd");
  const movimentacoesQ = useMovimentacoes(dateFromStr, dateStr);
  const veiculosEsperadosQ = useVeiculosEsperados(dateStr);
  const movimentacoesAll = movimentacoesQ.data ?? [];
  const veiculosEsperadosAll = veiculosEsperadosQ.data ?? [];

  const movimentacoes = useMemo(
    () =>
      movimentacoesAll.filter((m) => {
        if (m.categoria !== "terceirizado") return false;
        const mDate = m.data_hora ? format(new Date(m.data_hora), "yyyy-MM-dd") : null;
        if (mDate === dateStr) return true;
        // Movimentos de dias anteriores: só se ainda em aberto (não finalizado / sem saída)
        const aberto = m.etapa_terceirizado !== "finalizado" && !m.horario_saida;
        return aberto;
      }),
    [movimentacoesAll, dateStr]
  );

  // Buscar peso real (somatório de carregamentos_dia) para cada (carga, data)
  // das movimentações. IMPORTANTE: filtrar por data evita inflar o peso quando
  // o mesmo carga_id é reaproveitado em dias diferentes (ex.: "JR MIX").
  const refsCargaMov = useMemo(() => {
    const seen = new Set<string>();
    const out: { carga_id: string; data: string }[] = [];
    for (const m of movimentacoes) {
      if (!m.carga_id || !m.data_hora) continue;
      const d = format(new Date(m.data_hora), "yyyy-MM-dd");
      const k = `${m.carga_id}::${d}`;
      if (seen.has(k)) continue;
      seen.add(k);
      out.push({ carga_id: m.carga_id, data: d });
    }
    return out;
  }, [movimentacoes]);
  const { data: pesoPorCarga } = usePesoPorCarga(refsCargaMov);

  // Movimentações enriquecidas com peso vindo da carga (já que m.peso é nulo)
  const movimentacoesComPeso = useMemo(
    () =>
      movimentacoes.map((m) => {
        const d = m.data_hora ? format(new Date(m.data_hora), "yyyy-MM-dd") : null;
        const lookup = m.carga_id && d ? pesoPorCarga?.get(`${m.carga_id}::${d}`) : null;
        return {
          ...m,
          peso: m.peso != null ? m.peso : (lookup ?? null),
        };
      }),
    [movimentacoes, pesoPorCarga]
  );
  const veiculosEsperados = useMemo(
    () => veiculosEsperadosAll.filter((v) => v.grupo === "TERCEIRIZADO"),
    [veiculosEsperadosAll]
  );
  // Movimentações que indicam que o motorista JÁ chegou (no pátio ou aguardando liberação)
  const chegouOuNoPatio = useMemo(
    () =>
      movimentacoesComPeso.filter(
        (m) =>
          m.tipo_movimento === "entrada" &&
          m.etapa_terceirizado !== "finalizado" &&
          (!!m.horario_entrada ||
            m.etapa_terceirizado === "chegada" ||
            !!m.horario_chegada)
      ),
    [movimentacoesComPeso]
  );

  // Sets para deduplicar A chegar / Cargas fechadas
  const placasChegadas = useMemo(
    () =>
      new Set(
        chegouOuNoPatio
          .map((m) => (m.placa || "").trim().toUpperCase())
          .filter(Boolean)
      ),
    [chegouOuNoPatio]
  );
  const cargasComMotoristaChegado = useMemo(
    () =>
      new Set(
        chegouOuNoPatio
          .map((m) => {
            if (!m.carga_id) return null;
            const placa = (m.placa || "").trim().toUpperCase();
            // Chave composta carga_id|placa evita contaminação cruzada quando o
            // mesmo carga_id é reutilizado entre cargas distintas (ex.: "JR").
            return `${m.carga_id}|${placa}`;
          })
          .filter((x): x is string => !!x)
      ),
    [chegouOuNoPatio]
  );

  // A chegar — exclui placas/cargas que já chegaram
  const veiculosAChegar = useMemo(
    () =>
      veiculosEsperados.filter((v) => {
        if (v.conferido) return false;
        const placa = (v.placa || "").trim().toUpperCase();
        if (placa && placasChegadas.has(placa)) return false;
        if (v.carga_id && placa && cargasComMotoristaChegado.has(`${v.carga_id}|${placa}`)) return false;
        return true;
      }),
    [veiculosEsperados, placasChegadas, cargasComMotoristaChegado]
  );

  // === KPIs de peso alinhados ao Consolidado ===
  // Universo: todas as cargas terceirizadas do dia (com carry-over de 30d)
  // Peso: pesoEfetivo (rupturas totais = 0)
  // Carregado = cargas com etapa portaria "carregando" OU "expedido"
  // A carregar = restante (aguardando / chegou / patio)
  // Total = soma de tudo
  const cargasDoDiaQ = useCargasDiaExpedicao(dateStr);
  const cargasDoDia = cargasDoDiaQ.data ?? [];
  const cargaIdsDia = useMemo(
    () => cargasDoDia.map((c) => ({ carga_id: c.carga_id, data: c.data, placa: c.placa })),
    [cargasDoDia]
  );
  const statusPortariaQ = useStatusPortariaPorCarga(cargaIdsDia);
  const statusPortariaMap = statusPortariaQ.data;

  const pesosKpi = useMemo(() => {
    let kgCarregado = 0;
    let kgACarregar = 0;
    for (const c of cargasDoDia) {
      const etapa = statusPortariaMap?.get(c.carga_id)?.etapa ?? "aguardando";
      // "Carregado/em carregamento" quando:
      //  - portaria já registrou pátio/carregando/expedido OU
      //  - status do carregamento = "Carregado" (faturamento finalizou)
      const finalizadoNoFaturamento = c.status === "Carregado";
      const noPatioOuAdiante =
        etapa === "patio" || etapa === "carregando" || etapa === "expedido";
      if (noPatioOuAdiante || finalizadoNoFaturamento) {
        kgCarregado += c.pesoTotal;
      } else {
        kgACarregar += c.pesoTotal;
      }
    }
    return { kgCarregado, kgACarregar, kgTotal: kgCarregado + kgACarregar };
  }, [cargasDoDia, statusPortariaMap]);

  // Cargas expedidas do dia — saíram pela portaria ou marcadas como Carregado
  const cargasExpedidasDoDia = useMemo(() => {
    const out = cargasDoDia
      .map((c) => {
        const info = statusPortariaMap?.get(c.carga_id);
        const expedidaPortaria = info?.etapa === "expedido";
        const expedidaFaturamento = c.status === "Carregado";
        if (!expedidaPortaria && !expedidaFaturamento) return null;
        return { ...c, horarioSaida: info?.saida ?? null };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
    out.sort((a, b) => {
      const ta = a.horarioSaida ? new Date(a.horarioSaida).getTime() : 0;
      const tb = b.horarioSaida ? new Date(b.horarioSaida).getTime() : 0;
      return tb - ta;
    });
    return out;
  }, [cargasDoDia, statusPortariaMap]);

  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") setNow(new Date());
    }, 30_000);
    return () => clearInterval(id);
  }, []);

  const counts = useMemo(() => {
    const noPatio = movimentacoesComPeso.filter(
      (m) =>
        m.tipo_movimento === "entrada" &&
        m.horario_entrada &&
        m.etapa_terceirizado !== "finalizado"
    );
    const chegou = movimentacoesComPeso.filter(
      (m) =>
        m.tipo_movimento === "entrada" &&
        !m.horario_entrada &&
        (m.etapa_terceirizado === "chegada" || !!m.horario_chegada)
    );
    return {
      noPatio: noPatio.length,
      chegou: chegou.length,
      aChegar: veiculosAChegar.length,
      cargasFechadas: cargasExpedidasDoDia.length,
      kgCarregado: pesosKpi.kgCarregado,
      kgACarregar: pesosKpi.kgACarregar,
      kgTotal: pesosKpi.kgTotal,
    };
  }, [movimentacoesComPeso, veiculosAChegar, cargasExpedidasDoDia, pesosKpi]);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["movimentacoes_portaria"] });
    qc.invalidateQueries({ queryKey: ["veiculos_esperados"] });
    qc.invalidateQueries({ queryKey: ["cargas_dia_expedicao"] });
    qc.invalidateQueries({ queryKey: ["status_portaria_por_carga"] });
    setNow(new Date());
  };

  const isToday = dateStr === hojeStr;

  return (
    <Layout>
      <main className="space-y-4 p-4 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
              <Monitor className="h-6 w-6 md:h-7 md:w-7 text-primary shrink-0" />
              <span className="truncate">Expedição — Distribuidores</span>
            </h1>
            <p className="text-sm text-muted-foreground hidden sm:block">
              Pátio, chegadas, previsões e cargas prontas — atualização ao vivo
            </p>
          </div>
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted/60 border">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-mono font-bold text-lg tabular-nums">{format(now, "HH:mm")}</span>
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

        <ErrorBoundary name="Indicadores">
          <ExpedicaoKpiCards {...counts} />
        </ErrorBoundary>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4">
          <ErrorBoundary name="No Pátio">
            <PainelNoPatio movimentacoes={movimentacoesComPeso} now={now} />
          </ErrorBoundary>
          <ErrorBoundary name="Chegou — aguardando">
            <PainelChegou movimentacoes={movimentacoesComPeso} now={now} />
          </ErrorBoundary>
          <ErrorBoundary name="A chegar">
            <PainelAChegar veiculos={veiculosAChegar} hoje={hojeStr} />
          </ErrorBoundary>
          <ErrorBoundary name="Cargas expedidas do dia">
            <PainelCargasFechadas cargas={cargasExpedidasDoDia} />
          </ErrorBoundary>
        </div>
      </main>
    </Layout>
  );
}
