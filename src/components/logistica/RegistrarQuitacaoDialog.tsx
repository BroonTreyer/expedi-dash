import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Copy, CheckCircle2, Printer, CalendarIcon } from "lucide-react";
import { toast } from "sonner";
import { useRegistrarQuitacao, type Adiantamento } from "@/hooks/useAdiantamentos";
import { useTransportadorasFinanceiro } from "@/hooks/useTransportadorasFinanceiro";
import { consolidarPorOC } from "./AdiantamentosTab";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

const fmtBRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n || 0);

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  adiantamentos: Adiantamento[]; // todos da MESMA transportadora
}

export function RegistrarQuitacaoDialog({ open, onOpenChange, adiantamentos }: Props) {
  const { data: transp = [] } = useTransportadorasFinanceiro();
  const reg = useRegistrarQuitacao();
  const [obs, setObs] = useState("");
  const [dataQuitacao, setDataQuitacao] = useState<Date>(new Date());

  const transpNome = adiantamentos[0]?.transportadora ?? "";
  const info = transp.find((t) => t.nome === transpNome) ?? null;

  const totalSaldo = useMemo(
    () => adiantamentos.reduce((s, a) => s + Number(a.valor_saldo || 0), 0),
    [adiantamentos],
  );

  const grupos = useMemo(() => consolidarPorOC(adiantamentos), [adiantamentos]);

  const texto = useMemo(() => {
    if (adiantamentos.length === 0) return "";
    const fmtKg = (n: number) =>
      new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);
    const linhas: string[] = ["QUITAÇÃO DO FRETE CIF, FORA DO ESTADO.", ""];
    grupos.forEach((g, i) => {
      const rotulo =
        g.rep.tipo_agrupamento === "ordem" && g.rep.ordem_carga
          ? `OC ${g.rep.ordem_carga}`
          : `Lote ${g.rep.numero}`;
      const peso = g.items.reduce((s, a) => s + Number(a.peso_total || 0), 0);
      const ctes = g.items.flatMap((a) => a.cteNumbers ?? []);
      const cteTxt = ctes.length ? `  CTE ${ctes.join("/")}` : "";
      linhas.push(
        `${i + 1}. ${rotulo} (${fmtKg(peso)} KG)${cteTxt}   VLR ${fmtBRL(g.valorSaldo)}`,
      );
    });
    linhas.push("", `Valor Total a Quitar ${fmtBRL(totalSaldo)}`);
    if (info?.codigo) linhas.push(`Código ${info.codigo} – ${info.nome}`);
    if (info?.pix_chave) linhas.push(`Pix: ${info.pix_chave}`);
    return linhas.join("\n");
  }, [adiantamentos, grupos, info, totalSaldo]);

  const copy = async () => {
    await navigator.clipboard.writeText(texto);
    toast.success("Texto copiado");
  };

  if (adiantamentos.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Registrar Quitação — {transpNome}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="border rounded-md overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-emerald-700 text-white">
                <tr>
                  <th className="px-3 py-2 text-left">Valor em aberto</th>
                  <th className="px-3 py-2 text-left">COD</th>
                  <th className="px-3 py-2 text-left">Transportadora</th>
                  <th className="px-3 py-2 text-left">OC / Lote</th>
                </tr>
              </thead>
              <tbody>
                {grupos.map((g) => (
                  <tr key={g.key} className="bg-sky-50/60 border-t">
                    <td className="px-3 py-2 font-semibold">{fmtBRL(g.valorSaldo)}</td>
                    <td className="px-3 py-2">{info?.codigo ?? "—"}</td>
                    <td className="px-3 py-2">{g.rep.transportadora}</td>
                    <td className="px-3 py-2">
                      {g.rep.ordem_carga ?? g.rep.numero}
                      {g.items.length > 1 && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          ({g.qtdCtes} CT-e)
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                <tr className="bg-foreground text-background font-bold">
                  <td className="px-3 py-2">{fmtBRL(totalSaldo)}</td>
                  <td className="px-3 py-2" colSpan={3}>Valor a Pagar</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="text-sm space-y-1 border-t pt-2">
            <div><strong>Valor Saldo:</strong> {fmtBRL(totalSaldo)}</div>
            {info?.codigo && <div>Código {info.codigo} – {info.nome}</div>}
            {info?.pix_chave && <div>Pix: {info.pix_chave}</div>}
          </div>

          <div>
            <label className="text-sm font-medium">Observações</label>
            <Textarea value={obs} onChange={(e) => setObs(e.target.value)} rows={2} placeholder="Opcional — data da TED, comprovante, etc." />
          </div>

          <div>
            <label className="text-sm font-medium block mb-1">Data da quitação</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-[240px] justify-start text-left font-normal")}>
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  {dataQuitacao.toLocaleDateString("pt-BR")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dataQuitacao}
                  onSelect={(d) => d && setDataQuitacao(d)}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <DialogFooter className="flex-wrap gap-2">
          <Button variant="outline" onClick={copy}><Copy className="h-4 w-4 mr-1" /> Copiar texto</Button>
          <Button variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4 mr-1" /> Imprimir</Button>
          <Button
            onClick={async () => {
              // mantém a hora atual mas usa a data escolhida
              const now = new Date();
              const merged = new Date(dataQuitacao);
              merged.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
              await reg.mutateAsync({
                ids: adiantamentos.map((a) => a.id),
                observacoes: obs.trim() || undefined,
                quitado_em: merged.toISOString(),
              });
              onOpenChange(false);
              setObs("");
              setDataQuitacao(new Date());
            }}
            disabled={reg.isPending}
          >
            <CheckCircle2 className="h-4 w-4 mr-1" /> Confirmar Quitação
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}