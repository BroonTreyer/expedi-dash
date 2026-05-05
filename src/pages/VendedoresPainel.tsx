import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useAuth";
import { fetchAllPaginated } from "@/lib/supabase-paginate";
import { Layout } from "@/components/Layout";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Search, User, Loader2, ArrowRight } from "lucide-react";
import { format } from "date-fns";

interface VendedorRow {
  id: string;
  codigo_vendedor: string;
  nome_vendedor: string;
  pedidos_7d: number;
}

export default function VendedoresPainel() {
  const session = useSession();
  const [q, setQ] = useState("");

  const { data, isLoading } = useQuery<VendedorRow[]>({
    queryKey: ["vendedores-painel-list"],
    enabled: !!session,
    staleTime: 60_000,
    queryFn: async () => {
      const { data: vendedores, error } = await supabase
        .from("vendedores")
        .select("id, codigo_vendedor, nome_vendedor")
        .eq("ativo", true)
        .order("nome_vendedor");
      if (error) throw error;

      const since = new Date();
      since.setDate(since.getDate() - 6);
      const sinceStr = format(since, "yyyy-MM-dd");

      const cargas = await fetchAllPaginated<any>((from, to) =>
        supabase
          .from("carregamentos_dia")
          .select("vendedor_id, numero_pedido, id")
          .gte("data", sinceStr)
          .order("id", { ascending: true })
          .range(from, to),
      );

      const counts = new Map<string, Set<string>>();
      for (const r of (cargas ?? []) as any[]) {
        if (!r.vendedor_id) continue;
        const set = counts.get(r.vendedor_id) ?? new Set<string>();
        set.add(String(r.numero_pedido ?? Math.random()));
        counts.set(r.vendedor_id, set);
      }

      return (vendedores ?? []).map((v: any) => ({
        id: v.id,
        codigo_vendedor: v.codigo_vendedor,
        nome_vendedor: v.nome_vendedor,
        pedidos_7d: counts.get(v.id)?.size ?? 0,
      }));
    },
  });

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return data ?? [];
    return (data ?? []).filter(
      (v) =>
        v.nome_vendedor.toLowerCase().includes(term) ||
        v.codigo_vendedor.toLowerCase().includes(term),
    );
  }, [data, q]);

  return (
    <Layout>
      <div className="p-4 md:p-6 space-y-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2">
            <User className="h-5 w-5 text-muted-foreground" /> Painel do Vendedor
          </h1>
          <p className="text-sm text-muted-foreground">Selecione um vendedor para visualizar o painel individual.</p>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou código..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-9"
          />
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center gap-2 py-16">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Carregando vendedores...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            Nenhum vendedor encontrado.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map((v) => (
              <Link key={v.id} to={`/meu-painel/${v.id}`}>
                <Card className="p-4 hover:border-primary hover:shadow-sm transition-all cursor-pointer group">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold truncate">{v.nome_vendedor}</p>
                      <p className="text-xs text-muted-foreground">Código {v.codigo_vendedor}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                  </div>
                  <div className="mt-3 flex items-baseline gap-1">
                    <span className="text-2xl font-bold tabular-nums">{v.pedidos_7d}</span>
                    <span className="text-xs text-muted-foreground">pedidos · últimos 7 dias</span>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}