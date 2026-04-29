import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Truck, Phone, IdCard, MapPin, Package, Weight, Clock, Route as RouteIcon, MessageSquareWarning, Printer, MessageSquare, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDuracao } from "@/lib/portaria-tempos";
import { MotoristaSparkline } from "./MotoristaSparkline";
import { MotoristaPrintDialog } from "./MotoristaPrintDialog";
import { PhotoViewerDialog } from "@/components/portaria/PhotoViewerDialog";
import type { MotoristaAgg } from "@/hooks/useMotoristasPainel";

const fmtKm = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + " km";
const fmtDateTime = (s: string | null) =>
  s ? new Date(s).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—";

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

interface Props {
  motorista: MotoristaAgg | null;
  onClose: () => void;
  periodo?: { inicio: string; fim: string };
}

export function MotoristaDetalheDrawer({ motorista, onClose, periodo }: Props) {
  const [printOpen, setPrintOpen] = useState(false);
  const [foto, setFoto] = useState<{ url: string; alt: string } | null>(null);
  if (!motorista) return null;
  const m = motorista;
  const cad = m.cadastro;

  // Apenas movimentos de rota (com saída registrada)
  const rotas = m.movimentos
    .filter((i) => !!i.horario_real_saida || i.categoria === "carga_propria")
    .sort((a, b) =>
      new Date(b.horario_real_saida || b.data_hora).getTime() -
      new Date(a.horario_real_saida || a.data_hora).getTime(),
    );

  return (
    <>
    <Sheet open={!!motorista} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              {cad?.foto_motorista_url && <AvatarImage src={cad.foto_motorista_url} />}
              <AvatarFallback>
                {m.nome.split(" ").slice(0, 2).map((s) => s[0]).join("").toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="text-left flex-1">
              <p className="text-base font-semibold">{m.nome}</p>
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                {m.em_rota && (
                  <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300">
                    Em rota desde {fmtDateTime(m.em_rota_desde)}
                  </Badge>
                )}
                {m.obs_count > 0 && (
                  <Badge variant="outline" className="gap-1 border-amber-500/40 text-amber-700 dark:text-amber-300 bg-amber-500/10">
                    <MessageSquareWarning className="h-3 w-3" />
                    {m.obs_count} {m.obs_count === 1 ? "rota com observação" : "rotas com observação"}
                  </Badge>
                )}
              </div>
            </div>
            {periodo && (
              <Button size="sm" variant="outline" className="ml-auto" onClick={() => setPrintOpen(true)}>
                <Printer className="h-3.5 w-3.5 mr-1" /> Imprimir
              </Button>
            )}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          {cad && (
            <div className="text-xs text-muted-foreground flex flex-wrap gap-3">
              {cad.cpf && <span className="flex items-center gap-1"><IdCard className="h-3 w-3" />{cad.cpf}</span>}
              {cad.telefone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{cad.telefone}</span>}
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Stat icon={RouteIcon} label="Rotas" value={String(m.rotas)} />
            <Stat icon={MapPin} label="KM total" value={fmtKm(m.km_total)} />
            <Stat icon={Clock} label="Tempo médio" value={formatDuracao(m.tempo_medio_min ?? undefined)} />
            <Stat icon={Weight} label="Peso total" value={(m.peso_total / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + " t"} />
          </div>

          <Card>
            <CardContent className="p-3">
              <p className="text-xs font-medium mb-2">KM rodado por dia</p>
              <div className="flex items-end justify-between gap-1 h-16">
                {m.km_por_dia.length === 0 ? (
                  <p className="text-xs text-muted-foreground w-full text-center self-center">Sem dados no período</p>
                ) : (
                  m.km_por_dia.map((d) => {
                    const max = Math.max(...m.km_por_dia.map((x) => x.km), 1);
                    const h = Math.max(2, (d.km / max) * 100);
                    return (
                      <div key={d.dia} className="flex-1 flex flex-col items-center gap-1 min-w-0" title={`${d.dia}: ${fmtKm(d.km)}`}>
                        <div className="w-full bg-primary/70 rounded-sm" style={{ height: `${h}%` }} />
                        <span className="text-[9px] text-muted-foreground truncate">{d.dia.slice(8, 10)}/{d.dia.slice(5, 7)}</span>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>

          <div>
            <p className="text-sm font-semibold mb-2">Histórico de rotas ({rotas.length})</p>
            <div className="space-y-2">
              {rotas.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhuma rota registrada no período.</p>
              )}
              {rotas.map((r) => {
                const km = calcKm(r);
                const t = tempoMin(r);
                const fim = r.horario_real_retorno || r.horario_saida_final;
                const obs = (r.observacoes || "").trim();
                const ocorr = (r.ocorrencia || "").trim();
                const hasNote = !!obs || !!ocorr;
                const fotos: { url: string; label: string }[] = [
                  { url: r.foto_placa_url, label: "Placa" },
                  { url: r.foto_painel_saida_url, label: "Painel KM (saída)" },
                  { url: r.foto_painel_url, label: r.categoria === "carga_propria" ? "Painel KM (retorno)" : "Painel KM" },
                  { url: r.foto_lacre_url, label: "Lacre" },
                  { url: r.foto_nota_url, label: "Nota fiscal" },
                  { url: r.foto_documento_url, label: "Documento" },
                ].filter((f): f is { url: string; label: string } => !!f.url);
                return (
                  <Card key={r.id}>
                    <CardContent className="p-3 space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Truck className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="font-medium text-sm">{r.placa || "—"}</span>
                            {r.carga_id && <Badge variant="outline" className="text-[10px]">Carga {r.carga_id}</Badge>}
                            {r.categoria && <Badge variant="secondary" className="text-[10px]">{r.categoria.replace("_", " ")}</Badge>}
                            {!fim && r.horario_real_saida && (
                              <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 text-[10px]">Em andamento</Badge>
                            )}
                            {hasNote && (
                              <Badge variant="outline" className="text-[10px] gap-1 border-amber-500/40 text-amber-700 dark:text-amber-300 bg-amber-500/10">
                                <MessageSquareWarning className="h-3 w-3" /> com observação
                              </Badge>
                            )}
                            {fotos.length > 0 && (
                              <Badge variant="outline" className="text-[10px] gap-1">
                                <Camera className="h-3 w-3" /> {fotos.length} {fotos.length === 1 ? "foto" : "fotos"}
                              </Badge>
                            )}
                          </div>
                          {r.rota && <p className="text-xs text-muted-foreground mt-0.5">{r.rota}</p>}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-1">
                        <Mini label="Saída" value={fmtDateTime(r.horario_real_saida)} />
                        <Mini label="Retorno" value={fmtDateTime(fim)} />
                        <Mini label="KM" value={km > 0 ? fmtKm(km) : "—"} />
                        <Mini label="Tempo" value={formatDuracao(t ?? undefined)} />
                        {r.peso != null && <Mini label="Peso" value={`${Number(r.peso).toLocaleString("pt-BR", { maximumFractionDigits: 0 })} kg`} />}
                        {r.qtd_entregas != null && <Mini label="Entregas" value={String(r.qtd_entregas)} />}
                        {r.km_inicial != null && <Mini label="KM ini" value={Number(r.km_inicial).toLocaleString("pt-BR")} />}
                        {r.km_final != null && <Mini label="KM fim" value={Number(r.km_final).toLocaleString("pt-BR")} />}
                        {r.conferente && <Mini label="Conferente" value={r.conferente} />}
                        {r.numero_lacre && <Mini label="Lacre" value={r.numero_lacre} />}
                      </div>
                      {ocorr && (
                        <div className="mt-1.5 rounded-md border-l-2 border-amber-500 bg-amber-500/5 px-2 py-1.5">
                          <p className="text-[10px] font-semibold uppercase text-amber-700 dark:text-amber-300 flex items-center gap-1">
                            <MessageSquareWarning className="h-3 w-3" /> Ocorrência
                          </p>
                          <p className="text-xs whitespace-pre-wrap text-amber-800 dark:text-amber-200">{ocorr}</p>
                        </div>
                      )}
                      {obs && (
                        <div className="mt-1.5 rounded-md border-l-2 border-foreground/30 bg-muted/50 px-2 py-1.5">
                          <p className="text-[10px] font-semibold uppercase text-muted-foreground flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" /> Observações da portaria
                          </p>
                          <p className="text-xs whitespace-pre-wrap">{obs}</p>
                        </div>
                      )}
                      {fotos.length > 0 && (
                        <div className="mt-1.5">
                          <p className="text-[10px] font-semibold uppercase text-muted-foreground flex items-center gap-1 mb-1">
                            <Camera className="h-3 w-3" /> Fotos
                          </p>
                          <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                            {fotos.map((f) => (
                              <button
                                key={f.url}
                                type="button"
                                onClick={() => setFoto({ url: f.url, alt: f.label })}
                                className="group relative aspect-square overflow-hidden rounded-md border border-border bg-muted hover:ring-2 hover:ring-primary/50 transition"
                                title={f.label}
                              >
                                <img
                                  src={f.url}
                                  alt={f.label}
                                  loading="lazy"
                                  className="h-full w-full object-cover"
                                  onError={(e) => {
                                    (e.currentTarget as HTMLImageElement).style.display = "none";
                                  }}
                                />
                                <span className="absolute inset-x-0 bottom-0 bg-background/85 text-[9px] py-0.5 px-1 truncate text-center font-medium">
                                  {f.label}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
    <PhotoViewerDialog
      open={!!foto}
      onOpenChange={(o) => !o && setFoto(null)}
      url={foto?.url ?? null}
      alt={foto?.alt}
    />
    {periodo && (
      <MotoristaPrintDialog
        open={printOpen}
        onOpenChange={setPrintOpen}
        motorista={motorista}
        periodo={periodo}
      />
    )}
    </>
  );
}

function Stat({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-center gap-2 text-muted-foreground mb-1">
          <Icon className="h-3.5 w-3.5" />
          <span className="text-[10px]">{label}</span>
        </div>
        <p className="text-sm font-semibold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}
function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="font-medium tabular-nums">{value}</p>
    </div>
  );
}
