import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { ClipboardCheck, Truck, X, CheckCircle2, CalendarClock, Trash2, Loader2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { DeleteConfirmDialog } from "@/components/dashboard/DeleteConfirmDialog";
import type { VeiculoEsperado } from "@/hooks/useVeiculosEsperados";

interface Props {
  veiculos: VeiculoEsperado[];
  onRegistrar: (veiculo: VeiculoEsperado) => void;
  onClear?: () => void;
  isClearing?: boolean;
  onDeleteSelected?: (ids: string[]) => void;
  isDeletingSelected?: boolean;
  dataFiltrada?: string;
  readOnly?: boolean;
  search?: string;
  pendingIds?: Set<string>;
}

function isDataFutura(dataRef: string, dataFiltrada?: string): boolean {
  if (!dataFiltrada) return false;
  return dataRef > dataFiltrada;
}

function isDataPassada(dataRef: string, dataFiltrada?: string): boolean {
  if (!dataFiltrada) return false;
  return dataRef < dataFiltrada;
}

function DataPrevistaBadge({ dataRef }: { dataRef: string }) {
  return (
    <Badge variant="outline" className="text-[10px] h-5 border-amber-400 bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400 gap-0.5">
      <CalendarClock className="h-3 w-3" />
      Saída {format(parseISO(dataRef), "dd/MM")}
    </Badge>
  );
}

function DataAtrasadaBadge({ dataRef }: { dataRef: string }) {
  return (
    <Badge variant="outline" className="text-[10px] h-5 border-destructive bg-destructive/10 text-destructive gap-0.5">
      <CalendarClock className="h-3 w-3" />
      Atrasado {format(parseISO(dataRef), "dd/MM")}
    </Badge>
  );
}

export function VeiculosEsperadosPanel({ veiculos, onRegistrar, onClear, isClearing, onDeleteSelected, isDeletingSelected, dataFiltrada, readOnly, search, pendingIds }: Props) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (veiculos.length === 0) return null;

  const totalConferidos = veiculos.filter((v) => v.conferido).length;
  const pendentes = veiculos.length - totalConferidos;

  const pendingVeiculos = veiculos.filter((v) => !v.conferido);
  const filtered = search
    ? pendingVeiculos.filter((v) => {
        const s = search.toLowerCase();
        return [v.placa, v.motorista, v.transportadora, v.destino, v.carga_id]
          .some((field) => field?.toLowerCase().includes(s));
      })
    : pendingVeiculos;

  const canDelete = !!onDeleteSelected && !readOnly;
  const allVisibleSelected = filtered.length > 0 && filtered.every((v) => selectedIds.has(v.id));

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (allVisibleSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filtered.forEach((v) => next.delete(v.id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filtered.forEach((v) => next.add(v.id));
        return next;
      });
    }
  };

  const handleDeleteConfirm = () => {
    onDeleteSelected?.(Array.from(selectedIds));
    setSelectedIds(new Set());
    setConfirmOpen(false);
  };

  const selectionBar = canDelete && selectedIds.size > 0 && (
    <div className="flex items-center gap-2 px-4 py-2 bg-muted/50 border-b text-xs">
      <span className="font-medium">{selectedIds.size} selecionado(s)</span>
      <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => setSelectedIds(new Set())}>
        Limpar seleção
      </Button>
      <Button
        variant="destructive"
        size="sm"
        className="h-6 text-[10px] gap-1 ml-auto"
        onClick={() => setConfirmOpen(true)}
        disabled={isDeletingSelected}
      >
        <Trash2 className="h-3 w-3" />
        Excluir selecionados
      </Button>
    </div>
  );

  const confirmDialog = (
    <DeleteConfirmDialog
      open={confirmOpen}
      onOpenChange={setConfirmOpen}
      onConfirm={handleDeleteConfirm}
      title="Excluir veículos selecionados"
      description={`Tem certeza que deseja excluir ${selectedIds.size} veículo(s) da lista de esperados? Esta ação não pode ser desfeita.`}
    />
  );

  if (pendentes === 0) {
    return (
      <Card>
        <CardHeader className="py-3 px-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <ClipboardCheck className="h-4 w-4 text-primary shrink-0" />
                Veículos Esperados
              </CardTitle>
              <Badge variant="secondary" className="text-[10px] h-5">
                <CheckCircle2 className="h-3 w-3 mr-0.5" />
                {totalConferidos}/{veiculos.length} conferidos
              </Badge>
            </div>
            {!readOnly && onClear && (
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-muted-foreground self-end sm:self-auto" onClick={onClear} disabled={isClearing}>
                <X className="h-3 w-3" /> Limpar lista
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground text-center">✅ Todos os veículos foram conferidos!</p>
        </CardContent>
        {confirmDialog}
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="py-3 px-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4 text-primary shrink-0" />
              Veículos Esperados
            </CardTitle>
            <div className="flex flex-wrap gap-1">
              <Badge variant="secondary" className="text-[10px] h-5">
                {totalConferidos}/{veiculos.length} conferidos
              </Badge>
              {pendentes > 0 && (
                <Badge variant="outline" className="text-[10px] h-5 border-amber-300 text-amber-700 dark:text-amber-400">
                  {pendentes} pendentes
                </Badge>
              )}
            </div>
          </div>
          {!readOnly && onClear && (
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-muted-foreground self-end sm:self-auto" onClick={onClear} disabled={isClearing}>
              <X className="h-3 w-3" /> Limpar lista
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {selectionBar}

        {/* Mobile: Cards */}
        <div className="md:hidden space-y-2 p-3">
          {filtered.map((v) => {
            const isConferido = v.conferido;
            const isFuturo = isDataFutura(v.data_referencia, dataFiltrada);
            const isPassado = isDataPassada(v.data_referencia, dataFiltrada);
            const isSelected = selectedIds.has(v.id);
            return (
              <div
                key={v.id}
                className={`rounded-lg border bg-card p-3 space-y-2 ${isConferido ? "opacity-50" : ""} ${isFuturo && !isConferido ? "border-amber-300 dark:border-amber-700" : ""} ${isPassado && !isConferido ? "border-destructive/50" : ""} ${isSelected ? "ring-2 ring-primary" : ""}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {canDelete && (
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleOne(v.id)}
                        className="shrink-0"
                      />
                    )}
                    {isConferido ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                    ) : (
                      <Truck className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                    <span className={`font-mono font-bold text-sm ${isConferido ? "line-through" : ""}`}>
                      {v.placa}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {isFuturo && !isConferido && <DataPrevistaBadge dataRef={v.data_referencia} />}
                    {isPassado && !isConferido && <DataAtrasadaBadge dataRef={v.data_referencia} />}
                    <Badge
                      variant={isConferido ? "secondary" : "outline"}
                      className={`text-[10px] h-5 ${!isConferido ? "border-amber-300 text-amber-700 dark:text-amber-400" : ""}`}
                    >
                      {isConferido ? "Conferido" : "Pendente"}
                    </Badge>
                  </div>
                </div>
                <div className={`text-xs ${isConferido ? "line-through" : ""}`}>
                  <span className="text-muted-foreground">Motorista:</span> {v.motorista || "—"}
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                  <div><span className="text-muted-foreground">Rota:</span> {v.destino || "—"}</div>
                  <div><span className="text-muted-foreground">Carga:</span> {v.carga_id || "—"}</div>
                  <div><span className="text-muted-foreground">Peso:</span> {v.peso ?? "—"}</div>
                  <div><span className="text-muted-foreground">Entregas:</span> {v.qtd_entregas ?? "—"}</div>
                </div>
                {!isConferido && !readOnly && (
                  <Button size="sm" variant="outline" className="w-full h-8 text-xs gap-1" onClick={() => onRegistrar(v)} disabled={pendingIds?.has(v.id)}>
                    {pendingIds?.has(v.id) ? (<><Loader2 className="h-3.5 w-3.5 animate-spin" /> Registrando...</>) : "Registrar Chegada"}
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        {/* Desktop: Table */}
        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                {canDelete && (
                  <TableHead className="w-[40px]">
                    <Checkbox
                      checked={allVisibleSelected && filtered.length > 0}
                      onCheckedChange={toggleAll}
                    />
                  </TableHead>
                )}
                <TableHead className="text-[11px] w-[60px]">Status</TableHead>
                <TableHead className="text-[11px]">Placa</TableHead>
                <TableHead className="text-[11px]">Motorista</TableHead>
                <TableHead className="text-[11px]">Rota</TableHead>
                <TableHead className="text-[11px]">N° Carga</TableHead>
                <TableHead className="text-[11px] text-right">Peso</TableHead>
                <TableHead className="text-[11px] text-right">Entregas</TableHead>
                <TableHead className="text-[11px] w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((v) => {
                const isConferido = v.conferido;
                const isFuturo = isDataFutura(v.data_referencia, dataFiltrada);
                const isPassado = isDataPassada(v.data_referencia, dataFiltrada);
                const isSelected = selectedIds.has(v.id);
                return (
                  <TableRow key={v.id} className={`${isConferido ? "opacity-50" : ""} ${isFuturo && !isConferido ? "bg-amber-50/50 dark:bg-amber-950/20" : ""} ${isPassado && !isConferido ? "bg-destructive/5" : ""} ${isSelected ? "bg-primary/5" : ""}`}>
                    {canDelete && (
                      <TableCell className="py-1.5">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleOne(v.id)}
                        />
                      </TableCell>
                    )}
                    <TableCell className="py-1.5">
                      {isConferido ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      ) : (
                        <Truck className="h-4 w-4 text-muted-foreground" />
                      )}
                    </TableCell>
                    <TableCell className={`text-xs font-mono font-medium py-1.5 ${isConferido ? "line-through" : ""}`}>
                      <div className="flex items-center gap-1.5">
                        {v.placa}
                        {isFuturo && !isConferido && <DataPrevistaBadge dataRef={v.data_referencia} />}
                        {isPassado && !isConferido && <DataAtrasadaBadge dataRef={v.data_referencia} />}
                      </div>
                    </TableCell>
                    <TableCell className={`text-xs py-1.5 ${isConferido ? "line-through" : ""}`}>
                      {v.motorista || "—"}
                    </TableCell>
                    <TableCell className="text-xs py-1.5">{v.destino || "—"}</TableCell>
                    <TableCell className="text-xs py-1.5">{v.carga_id || "—"}</TableCell>
                    <TableCell className="text-xs py-1.5 text-right">{v.peso ?? "—"}</TableCell>
                    <TableCell className="text-xs py-1.5 text-right">{v.qtd_entregas ?? "—"}</TableCell>
                    <TableCell className="py-1.5">
                      {!isConferido && !readOnly && (
                        <Button size="sm" variant="outline" className="h-6 text-[10px] gap-1" onClick={() => onRegistrar(v)} disabled={pendingIds?.has(v.id)}>
                          {pendingIds?.has(v.id) ? (<><Loader2 className="h-3 w-3 animate-spin" /> Registrando</>) : "Registrar Chegada"}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
      {confirmDialog}
    </Card>
  );
}
