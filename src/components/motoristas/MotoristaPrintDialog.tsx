import { useCallback, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, X } from "lucide-react";
import { formatDuracao } from "@/lib/portaria-tempos";
import type { MotoristaAgg } from "@/hooks/useMotoristasPainel";
import fricoLogo from "@/assets/frico-logo-optimized.webp";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  motorista: MotoristaAgg | null;
  periodo: { inicio: string; fim: string };
}

const fmtKm = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
const fmtKg = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
const fmtDateTime = (s: string | null | undefined) =>
  s ? new Date(s).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—";
const fmtDateBR = (s: string) => {
  const [y, m, d] = s.split("-");
  return `${d}/${m}/${y}`;
};

function calcKm(m: any): number {
  if (m.km_rodado != null && Number(m.km_rodado) > 0) return Number(m.km_rodado);
  if (m.km_inicial != null && m.km_final != null) {
    const d = Number(m.km_final) - Number(m.km_inicial);
    return d > 0 && d < 5000 ? d : 0;
  }
  return 0;
}
function tempoMin(m: any): number | null {
  const ini = m.horario_real_saida;
  const fim = m.horario_real_retorno || m.horario_saida_final;
  if (!ini || !fim) return null;
  const d = (new Date(fim).getTime() - new Date(ini).getTime()) / 60000;
  return d > 0 ? Math.round(d) : null;
}

export function MotoristaPrintDialog({ open, onOpenChange, motorista, periodo }: Props) {
  const cleanup = useCallback(() => {
    document.body.classList.remove("printing-carga");
    const root = document.getElementById("carga-print-root");
    if (root) root.remove();
  }, []);

  useEffect(() => {
    window.addEventListener("afterprint", cleanup);
    return () => window.removeEventListener("afterprint", cleanup);
  }, [cleanup]);

  if (!motorista) return null;

  const rotas = motorista.movimentos
    .filter((i) => !!i.horario_real_saida || i.categoria === "carga_propria")
    .sort(
      (a, b) =>
        new Date(b.horario_real_saida || b.data_hora).getTime() -
        new Date(a.horario_real_saida || a.data_hora).getTime(),
    );

  const doPrint = () => {
    const source = document.getElementById("motorista-print-content");
    if (!source) return;
    const prev = document.getElementById("carga-print-root");
    if (prev) prev.remove();

    const wrapper = document.createElement("div");
    wrapper.id = "carga-print-root";
    wrapper.appendChild(source.cloneNode(true));
    document.body.appendChild(wrapper);

    const images = wrapper.querySelectorAll("img");
    const promises = Array.from(images).map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete && img.naturalWidth > 0) return resolve();
          img.onload = () => resolve();
          img.onerror = () => resolve();
        }),
    );
    Promise.all(promises).then(() => {
      document.body.classList.add("printing-carga");
      window.print();
      setTimeout(cleanup, 2000);
    });
  };

  const cad = motorista.cadastro;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto w-[calc(100vw-2rem)] sm:w-full">
        <DialogHeader className="sr-only">
          <DialogTitle>Histórico do Motorista</DialogTitle>
          <DialogDescription>Visualização para impressão</DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between gap-2 mb-4 print:hidden">
          <p className="text-sm text-muted-foreground">
            Histórico de {motorista.nome} · {fmtDateBR(periodo.inicio)} a {fmtDateBR(periodo.fim)}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4 mr-1" /> Fechar
            </Button>
            <Button size="sm" onClick={doPrint}>
              <Printer className="h-4 w-4 mr-1" /> Imprimir
            </Button>
          </div>
        </div>

        <div id="motorista-print-content" className="space-y-4 text-foreground">
          <div className="flex items-center justify-between border-b-2 border-foreground/20 pb-3">
            <img src={fricoLogo} alt="Frico" className="h-12 object-contain" width={48} height={48} />
            <div className="text-right">
              <h1 className="text-lg font-bold uppercase tracking-wide">Histórico do Motorista</h1>
              <p className="text-sm text-muted-foreground">
                {fmtDateBR(periodo.inicio)} a {fmtDateBR(periodo.fim)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
            <div><span className="font-semibold">Motorista:</span> {motorista.nome}</div>
            {cad?.cpf && <div><span className="font-semibold">CPF:</span> {cad.cpf}</div>}
            {cad?.telefone && <div><span className="font-semibold">Telefone:</span> {cad.telefone}</div>}
            <div><span className="font-semibold">Status:</span> {motorista.em_rota ? "Em rota" : "Disponível"}</div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs border border-foreground/10 rounded-md p-2">
            <Kpi label="Rotas" value={String(motorista.rotas)} />
            <Kpi label="KM total" value={`${fmtKm(motorista.km_total)} km`} />
            <Kpi label="KM médio" value={`${fmtKm(motorista.km_medio)} km`} />
            <Kpi label="Tempo médio" value={formatDuracao(motorista.tempo_medio_min ?? undefined)} />
            <Kpi label="Peso total" value={`${fmtKg(motorista.peso_total)} kg`} />
            <Kpi label="Peso médio" value={`${fmtKg(motorista.peso_medio)} kg`} />
            <Kpi label="Entregas" value={String(motorista.entregas_total)} />
            <Kpi label="Obs/Ocorr." value={String(motorista.obs_count)} />
          </div>

          <div>
            <h2 className="text-sm font-bold mb-2 uppercase tracking-wide">Rotas no período ({rotas.length})</h2>
            <div className="space-y-2">
              {rotas.length === 0 && (
                <p className="text-xs text-muted-foreground">Nenhuma rota registrada.</p>
              )}
              {rotas.map((r) => {
                const km = calcKm(r);
                const t = tempoMin(r);
                const fim = r.horario_real_retorno || r.horario_saida_final;
                const obs = (r.observacoes || "").trim();
                const ocorr = (r.ocorrencia || "").trim();
                const fotos: { url: string; label: string }[] = [
                  { url: r.foto_placa_url, label: "Placa" },
                  { url: r.foto_painel_saida_url, label: "Painel KM (saída)" },
                  { url: r.foto_painel_url, label: r.categoria === "carga_propria" ? "Painel KM (retorno)" : "Painel KM" },
                  { url: r.foto_lacre_url, label: "Lacre" },
                ].filter((f): f is { url: string; label: string } => !!f.url);
                return (
                  <div
                    key={r.id}
                    className="border border-foreground/10 rounded-md p-2 break-inside-avoid text-[11px]"
                  >
                    <div className="flex items-baseline justify-between gap-2 mb-1">
                      <div className="font-semibold">
                        {fmtDateTime(r.horario_real_saida || r.data_hora)} · {r.placa || "—"}
                        {r.carga_id && <span className="ml-1 text-muted-foreground">(Carga {r.carga_id})</span>}
                      </div>
                      <span className="text-muted-foreground">{r.categoria?.replace("_", " ")}</span>
                    </div>
                    {r.rota && <p className="text-muted-foreground mb-1">Rota: {r.rota}</p>}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-3 gap-y-0.5">
                      <Mini label="Saída" value={fmtDateTime(r.horario_real_saida)} />
                      <Mini label="Retorno" value={fmtDateTime(fim)} />
                      <Mini label="Tempo" value={formatDuracao(t ?? undefined)} />
                      <Mini label="KM rodado" value={km > 0 ? `${fmtKm(km)} km` : "—"} />
                      {r.km_inicial != null && <Mini label="KM ini" value={Number(r.km_inicial).toLocaleString("pt-BR")} />}
                      {r.km_final != null && <Mini label="KM fim" value={Number(r.km_final).toLocaleString("pt-BR")} />}
                      {r.peso != null && <Mini label="Peso" value={`${fmtKg(Number(r.peso))} kg`} />}
                      {r.qtd_entregas != null && <Mini label="Entregas" value={String(r.qtd_entregas)} />}
                      {r.conferente && <Mini label="Conferente" value={r.conferente} />}
                      {r.numero_lacre && <Mini label="Lacre" value={r.numero_lacre} />}
                    </div>
                    {ocorr && (
                      <div className="mt-1.5 border-l-2 border-amber-500 pl-2 bg-amber-500/5 py-1">
                        <p className="font-semibold text-amber-700 uppercase text-[10px]">Ocorrência</p>
                        <p className="whitespace-pre-wrap">{ocorr}</p>
                      </div>
                    )}
                    {obs && (
                      <div className="mt-1.5 border-l-2 border-foreground/30 pl-2 bg-muted/40 py-1">
                        <p className="font-semibold uppercase text-[10px]">Observações da portaria</p>
                        <p className="whitespace-pre-wrap">{obs}</p>
                      </div>
                    )}
                    {fotos.length > 0 && (
                      <div className="mt-1.5 break-inside-avoid">
                        <p className="font-semibold uppercase text-[10px] text-muted-foreground mb-1">Fotos</p>
                        <div className="grid grid-cols-4 gap-1.5">
                          {fotos.map((f) => (
                            <div key={f.url} className="border border-foreground/10 rounded overflow-hidden">
                              <img
                                src={f.url}
                                alt={f.label}
                                className="w-full h-24 object-cover"
                                crossOrigin="anonymous"
                              />
                              <p className="text-[9px] text-center py-0.5 px-1 truncate">{f.label}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="border-t border-foreground/20 pt-2 text-[10px] text-muted-foreground flex justify-between">
            <span>Impresso em {new Date().toLocaleString("pt-BR")}</span>
            <span>Frico — Painel de Motoristas</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className="font-semibold tabular-nums">{value}</p>
    </div>
  );
}
function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-muted-foreground">{label}: </span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}