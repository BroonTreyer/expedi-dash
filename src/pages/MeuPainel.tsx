import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useSession } from "@/hooks/useAuth";
import { Layout } from "@/components/Layout";
import { useMeuPainel, useMeuPainelAdmin } from "@/hooks/useMeuPainel";
import { KpiVendedor } from "@/components/vendedor/KpiVendedor";
import { CargasAndamentoVendedor } from "@/components/vendedor/CargasAndamentoVendedor";
import { GraficosVendedor } from "@/components/vendedor/GraficosVendedor";
import { RupturasVendedor } from "@/components/vendedor/RupturasVendedor";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { MeusPedidos } from "@/components/vendedor/MeusPedidos";
import { CalendarIcon, Loader2, User, Shield, ArrowLeft } from "lucide-react";
import { format, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";

const today = new Date();
const last7 = (() => { const d = new Date(); d.setDate(d.getDate() - 6); return d; })();

export default function MeuPainel() {
  const [dateRange, setDateRange] = useState<DateRange>({ from: last7, to: today });
  const { vendedorId: paramId } = useParams<{ vendedorId?: string }>();
  const navigate = useNavigate();
  const { role } = useAuth();
  const session = useSession();
  const isAdminView = role === "admin" && !!paramId;

  const selfQ = useMeuPainel(dateRange);
  const adminQ = useMeuPainelAdmin(dateRange, isAdminView ? paramId! : null);
  const { data, isLoading } = isAdminView ? adminQ : selfQ;

  // Admin: lista de vendedores para o seletor
  const { data: vendedoresList } = useQuery<Array<{ id: string; nome_vendedor: string; codigo_vendedor: string }>>({
    queryKey: ["vendedores-select"],
    enabled: !!session && role === "admin",
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendedores")
        .select("id, nome_vendedor, codigo_vendedor")
        .eq("ativo", true)
        .order("nome_vendedor");
      if (error) throw error;
      return (data ?? []) as any;
    },
  });

  const carregamentos = data?.carregamentos ?? [];
  const meusPedidos = data?.meusPedidos ?? [];

  return (
    <Layout>
      <div className="p-4 md:p-6 space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2 flex-wrap">
              <User className="h-5 w-5 text-muted-foreground" /> Meu Painel
              {isAdminView && (
                <Badge variant="secondary" className="gap-1 text-[11px]">
                  <Shield className="h-3 w-3" /> Visão Admin
                </Badge>
              )}
            </h1>
            <p className="text-sm text-muted-foreground">
              {data?.vendedorNome ? `Olá, ${data.vendedorNome}` : "Visão pessoal de vendas e expedição"}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            {isAdminView && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 gap-1.5 self-start sm:self-auto"
                  onClick={() => navigate("/vendedores-painel")}
                >
                  <ArrowLeft className="h-4 w-4" /> Voltar
                </Button>
                <Select value={paramId} onValueChange={(v) => navigate(`/meu-painel/${v}`)}>
                  <SelectTrigger className="h-9 w-full sm:w-[220px]">
                    <SelectValue placeholder="Trocar vendedor" />
                  </SelectTrigger>
                  <SelectContent>
                    {(vendedoresList ?? []).map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.nome_vendedor}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            )}

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
          <Tabs defaultValue="pedidos" className="space-y-4">
            <TabsList className="w-full overflow-x-auto justify-start sm:justify-center sm:w-auto">
              <TabsTrigger value="pedidos" className="flex-shrink-0">
                Meus Pedidos
                {meusPedidos.length > 0 && (
                  <Badge variant="secondary" className="ml-2">{meusPedidos.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="cargas" className="flex-shrink-0">Cargas</TabsTrigger>
              <TabsTrigger value="rupturas" className="flex-shrink-0">Rupturas</TabsTrigger>
              <TabsTrigger value="resumo" className="flex-shrink-0">Resumo</TabsTrigger>
            </TabsList>

            <TabsContent value="pedidos" className="space-y-4">
              {isAdminView && (
                <div className="rounded-md border border-amber-200 bg-amber-50/60 px-3 py-2 text-xs text-amber-900 flex items-center gap-2">
                  <Shield className="h-3.5 w-3.5" />
                  Você está lançando pedidos em nome de <strong>{data?.vendedorNome ?? "—"}</strong>.
                </div>
              )}
              <MeusPedidos
                vendedorId={data!.vendedorId!}
                meusPedidos={meusPedidos}
                carregamentos={carregamentos}
              />
            </TabsContent>

            <TabsContent value="cargas">
              <CargasAndamentoVendedor carregamentos={carregamentos} />
            </TabsContent>

            <TabsContent value="rupturas">
              <RupturasVendedor carregamentos={carregamentos} />
            </TabsContent>

            <TabsContent value="resumo" className="space-y-4">
              <KpiVendedor carregamentos={carregamentos} />
              <GraficosVendedor carregamentos={carregamentos} />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </Layout>
  );
}