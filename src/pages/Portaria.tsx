import { useState, useMemo } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, LogOut, RotateCw, Eye, Search, Truck } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useRegistrosPortaria, type RegistroPortaria } from "@/hooks/useRegistrosPortaria";
import { RegistroPortariaDialog } from "@/components/portaria/RegistroPortariaDialog";
import { EvidenciasViewer } from "@/components/portaria/EvidenciasViewer";
import { PortariaKpiCards } from "@/components/portaria/PortariaKpiCards";

interface CargaResumo {
  carga_id: string;
  placa: string | null;
  motorista: string | null;
  tipo_caminhao: string | null;
  data: string;
}

export default function Portaria() {
  const [date, setDate] = useState<Date>(new Date());
  const dateStr = format(date, "yyyy-MM-dd");
  const [search, setSearch] = useState("");

  // Fetch distinct cargas for the day
  const { data: cargas = [], isLoading: loadingCargas } = useQuery({
    queryKey: ["cargas_portaria", dateStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("carregamentos_dia")
        .select("carga_id, placa, motorista, tipo_caminhao, data")
        .eq("data", dateStr)
        .not("carga_id", "is", null);
      if (error) throw error;

      // deduplicate by carga_id
      const map = new Map<string, CargaResumo>();
      (data ?? []).forEach((r: any) => {
        if (r.carga_id && !map.has(r.carga_id)) {
          map.set(r.carga_id, r as CargaResumo);
        }
      });
      return Array.from(map.values());
    },
  });

  const { data: registros = [], isLoading: loadingRegistros } = useRegistrosPortaria(dateStr);

  // Index registros by carga_id
  const registrosByCarga = useMemo(() => {
    const map = new Map<string, RegistroPortaria[]>();
    registros.forEach((r) => {
      const arr = map.get(r.carga_id) || [];
      arr.push(r);
      map.set(r.carga_id, arr);
    });
    return map;
  }, [registros]);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogTipo, setDialogTipo] = useState<"saida" | "retorno">("saida");
  const [dialogCarga, setDialogCarga] = useState<CargaResumo | null>(null);
  const [evidenciasOpen, setEvidenciasOpen] = useState(false);
  const [evidenciasCarga, setEvidenciasCarga] = useState<RegistroPortaria[]>([]);

  const openRegistro = (carga: CargaResumo, tipo: "saida" | "retorno") => {
    setDialogCarga(carga);
    setDialogTipo(tipo);
    setDialogOpen(true);
  };

  const openEvidencias = (cargaId: string) => {
    setEvidenciasCarga(registrosByCarga.get(cargaId) || []);
    setEvidenciasOpen(true);
  };

  const filtered = cargas.filter((c) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      c.carga_id?.toLowerCase().includes(s) ||
      c.placa?.toLowerCase().includes(s) ||
      c.motorista?.toLowerCase().includes(s)
    );
  });

  const getStatusPortaria = (cargaId: string) => {
    const regs = registrosByCarga.get(cargaId) || [];
    const temSaida = regs.some((r) => r.tipo_registro === "saida");
    const temRetorno = regs.some((r) => r.tipo_registro === "retorno");
    if (temSaida && temRetorno) return { label: "Completo", variant: "default" as const };
    if (temSaida) return { label: "Em viagem", variant: "secondary" as const };
    return { label: "Aguardando", variant: "outline" as const };
  };

  const getSaidaRegistro = (cargaId: string) => {
    return (registrosByCarga.get(cargaId) || []).find((r) => r.tipo_registro === "saida") ?? null;
  };

  return (
    <Layout>
      <div className="space-y-4 p-4 md:p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-foreground flex items-center gap-2">
              <Truck className="h-6 w-6 text-primary" />
              Controle de Portaria
            </h1>
            <p className="text-sm text-muted-foreground">
              Registro de saída e retorno com evidência fotográfica
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  {format(date, "dd/MM/yyyy", { locale: ptBR })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => d && setDate(d)}
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* KPIs */}
        <PortariaKpiCards registros={registros} />

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar carga, placa ou motorista..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Table */}
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-base">Cargas do Dia</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Carga</TableHead>
                    <TableHead>Placa</TableHead>
                    <TableHead>Motorista</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingCargas ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        Carregando...
                      </TableCell>
                    </TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        Nenhuma carga encontrada para esta data.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((c) => {
                      const status = getStatusPortaria(c.carga_id);
                      const temSaida = (registrosByCarga.get(c.carga_id) || []).some(
                        (r) => r.tipo_registro === "saida"
                      );
                      const temRetorno = (registrosByCarga.get(c.carga_id) || []).some(
                        (r) => r.tipo_registro === "retorno"
                      );
                      const regsCount = (registrosByCarga.get(c.carga_id) || []).length;

                      return (
                        <TableRow key={c.carga_id}>
                          <TableCell className="font-medium">{c.carga_id}</TableCell>
                          <TableCell>{c.placa || "—"}</TableCell>
                          <TableCell>{c.motorista || "—"}</TableCell>
                          <TableCell className="text-xs">{c.tipo_caminhao || "—"}</TableCell>
                          <TableCell>
                            <Badge variant={status.variant}>{status.label}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-1 flex-wrap">
                              {!temSaida && (
                                <Button
                                  size="sm"
                                  variant="default"
                                  className="gap-1"
                                  onClick={() => openRegistro(c, "saida")}
                                >
                                  <LogOut className="h-3 w-3" /> Saída
                                </Button>
                              )}
                              {temSaida && !temRetorno && (
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  className="gap-1"
                                  onClick={() => openRegistro(c, "retorno")}
                                >
                                  <RotateCw className="h-3 w-3" /> Retorno
                                </Button>
                              )}
                              {regsCount > 0 && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="gap-1"
                                  onClick={() => openEvidencias(c.carga_id)}
                                >
                                  <Eye className="h-3 w-3" /> {regsCount}
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dialogs */}
      {dialogCarga && (
        <RegistroPortariaDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          tipo={dialogTipo}
          cargaId={dialogCarga.carga_id}
          placaPrevista={dialogCarga.placa}
          registroSaida={dialogTipo === "retorno" ? getSaidaRegistro(dialogCarga.carga_id) : null}
        />
      )}

      <EvidenciasViewer
        open={evidenciasOpen}
        onOpenChange={setEvidenciasOpen}
        registros={evidenciasCarga}
      />
    </Layout>
  );
}
