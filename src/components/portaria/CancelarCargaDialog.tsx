import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { AlertOctagon, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCreateOcorrencia } from "@/hooks/useOcorrencias";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { CargaFechadaAguardando } from "@/hooks/useCarregamentos";

const MOTIVOS = [
  "Motorista foi embora (espera demais)",
  "Atraso operacional",
  "Veículo recusado",
  "Cliente cancelou",
  "Problema no veículo",
  "Falta de produto",
  "Outro",
];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  carga: CargaFechadaAguardando;
}

export function CancelarCargaDialog({ open, onOpenChange, carga }: Props) {
  const [motivo, setMotivo] = useState<string>("");
  const [motivoCustom, setMotivoCustom] = useState("");
  const [observacao, setObservacao] = useState("");
  const [busy, setBusy] = useState(false);
  const qc = useQueryClient();
  const createOcorrencia = useCreateOcorrencia();

  const motivoFinal = motivo === "Outro" ? motivoCustom.trim() : motivo;

  const handleConfirm = async () => {
    if (!motivoFinal) {
      toast.error("Informe o motivo do cancelamento");
      return;
    }
    setBusy(true);
    try {
      // 1. Registra ocorrência
      await createOcorrencia.mutateAsync({
        tipo: "carga_cancelada",
        motivo: motivoFinal,
        observacao: observacao.trim() || null,
        carga_id: carga.carga_id,
        nome_carga: carga.nome_carga,
        placa: carga.placa,
        motorista: carga.motorista,
        transportadora: carga.transportadora,
        peso_total: carga.peso_total,
        qtd_pedidos: carga.qtd_pedidos,
        data_carga: carga.data,
      });

      // 2. Busca itens da carga para preservar agrupamento por pedido
      const { data: itens, error: eFetch } = await supabase
        .from("carregamentos_dia")
        .select("id, codigo_cliente, numero_pedido, cliente, data")
        .eq("carga_id", carga.carga_id);
      if (eFetch) throw eFetch;

      // 2.1. Reverte pedidos para vendas (libera para refazer carga).
      // Limpa TODOS os campos logísticos para que o pedido volte "limpo".
      // Mantém data/cliente/numero_pedido intactos para preservar o
      // agrupamento original na tela de Vendas
      // (chave: data + codigo_cliente + numero_pedido).
      const nowIso = new Date().toISOString();
      const { error: e1 } = await supabase
        .from("carregamentos_dia")
        .update({
          etapa: "vendas",
          status: "Aguardando",
          carga_id: null,
          nome_carga: null,
          placa: null,
          motorista: null,
          transportadora: null,
          tipo_caminhao: null,
          tipo_frete: null,
          horario_inicio: null,
          horario_fim: null,
          horario_previsto: null,
          ordem_entrega: null,
          ordem_carga: null,
          updated_at: nowIso,
        })
        .eq("carga_id", carga.carga_id);
      if (e1) throw e1;

      // 2.2. Normalização defensiva: garante que itens do mesmo pedido
      // (codigo_cliente + numero_pedido) compartilhem a MESMA data e cliente,
      // alinhando-os pela referência mais antiga do grupo. Evita que
      // produtos do mesmo pedido apareçam separados após o retorno.
      type Item = { id: string; codigo_cliente: string | null; numero_pedido: number | null; cliente: string | null; data: string };
      const grupos = new Map<string, Item[]>();
      for (const it of (itens ?? []) as Item[]) {
        if (!it.codigo_cliente || it.numero_pedido == null) continue;
        const k = `${it.codigo_cliente}__${it.numero_pedido}`;
        const arr = grupos.get(k) ?? [];
        arr.push(it);
        grupos.set(k, arr);
      }
      for (const arr of grupos.values()) {
        if (arr.length < 2) continue;
        // Referência: menor data do grupo + primeiro nome de cliente disponível
        const ref = arr.reduce((acc, x) => (x.data < acc.data ? x : acc), arr[0]);
        const refCliente = arr.find((x) => x.cliente)?.cliente ?? ref.cliente ?? null;
        const desalinhados = arr.filter(
          (x) => x.data !== ref.data || (refCliente && x.cliente !== refCliente),
        );
        if (desalinhados.length === 0) continue;
        await supabase
          .from("carregamentos_dia")
          .update({ data: ref.data, cliente: refCliente, updated_at: nowIso })
          .in("id", desalinhados.map((x) => x.id));
      }

      // 3. Remove veículo esperado vinculado a esta carga
      await supabase
        .from("veiculos_esperados" as any)
        .delete()
        .eq("carga_id", carga.carga_id);

      // 4. Remove movimentação de chegada não concluída (caso exista)
      if (carga.movimentoChegadaId) {
        await supabase
          .from("movimentacoes_portaria")
          .delete()
          .eq("id", carga.movimentoChegadaId)
          .is("horario_entrada", null);
      }

      // 5. Audit log
      const pedidosAfetados = Array.from(
        new Set(
          ((itens ?? []) as { numero_pedido: number | null }[])
            .map((x) => x.numero_pedido)
            .filter((n): n is number => n != null),
        ),
      );
      const datasAfetadas = Array.from(
        new Set(((itens ?? []) as { data: string }[]).map((x) => x.data)),
      );
      await supabase.rpc("log_audit", {
        _entity_type: "carga",
        _entity_id: carga.carga_id,
        _action: "cancelada",
        _changes: {
          motivo: motivoFinal,
          observacao: observacao.trim() || null,
          peso_total: carga.peso_total,
          qtd_pedidos: carga.qtd_pedidos,
          placa: carga.placa,
          motorista: carga.motorista,
          linhas_revertidas: itens?.length ?? 0,
          pedidos_afetados: pedidosAfetados,
          datas_afetadas: datasAfetadas,
        } as any,
      });

      toast.success("Carga cancelada e pedidos liberados");
      qc.invalidateQueries({ queryKey: ["carregamentos"] });
      qc.invalidateQueries({ queryKey: ["cargas_fechadas_aguardando"] });
      qc.invalidateQueries({ queryKey: ["veiculos_esperados"] });
      qc.invalidateQueries({ queryKey: ["movimentacoes_portaria"] });
      qc.invalidateQueries({ queryKey: ["status_portaria_por_carga"] });
      qc.invalidateQueries({ queryKey: ["ocorrencias_carga"] });
      onOpenChange(false);
      // reset
      setMotivo("");
      setMotivoCustom("");
      setObservacao("");
    } catch (e: any) {
      toast.error(e.message || "Erro ao cancelar carga");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !busy && onOpenChange(v)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertOctagon className="h-5 w-5" />
            Cancelar carga
          </DialogTitle>
          <DialogDescription>
            Os pedidos voltarão para "Vendas" e poderão ser refeitos em outra carga.
            O motivo ficará registrado em <strong>Ocorrências</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="rounded-md border bg-muted/30 p-2 text-xs space-y-0.5">
            <div><span className="text-muted-foreground">Carga:</span> <span className="font-medium">{carga.nome_carga || carga.carga_id}</span></div>
            <div className="text-muted-foreground">
              {carga.qtd_pedidos} pedido(s) · {carga.peso_total.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg
            </div>
            {carga.placa && <div><span className="text-muted-foreground">Placa:</span> <span className="font-mono">{carga.placa}</span> {carga.motorista && <span className="text-muted-foreground">— {carga.motorista}</span>}</div>}
          </div>

          <div className="space-y-1.5">
            <Label>Motivo *</Label>
            <Select value={motivo} onValueChange={setMotivo} disabled={busy}>
              <SelectTrigger><SelectValue placeholder="Selecione o motivo" /></SelectTrigger>
              <SelectContent>
                {MOTIVOS.map((m) => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {motivo === "Outro" && (
              <Input
                placeholder="Descreva o motivo"
                value={motivoCustom}
                onChange={(e) => setMotivoCustom(e.target.value)}
                disabled={busy}
              />
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Observação (opcional)</Label>
            <Textarea
              placeholder="Detalhes adicionais — o que aconteceu, quem foi avisado, etc."
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              rows={3}
              disabled={busy}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Voltar
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={busy || !motivoFinal}>
            {busy && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            Confirmar cancelamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}