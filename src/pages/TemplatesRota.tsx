import { useMemo, useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Route, Trash2, MapPin, Search, Repeat } from "lucide-react";
import { useRouteTemplates, useDeleteRouteTemplate, type RouteTemplate } from "@/hooks/useRouteTemplates";
import { DeleteConfirmDialog } from "@/components/dashboard/DeleteConfirmDialog";

export default function TemplatesRota() {
  const { data: templates = [], isLoading } = useRouteTemplates();
  const del = useDeleteRouteTemplate();
  const [search, setSearch] = useState("");
  const [toDelete, setToDelete] = useState<RouteTemplate | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return templates;
    return templates.filter(
      (t) =>
        t.nome.toLowerCase().includes(q) ||
        (t.descricao ?? "").toLowerCase().includes(q) ||
        t.origem.toLowerCase().includes(q) ||
        t.paradas.some((p) => `${p.cidade} ${p.uf} ${p.cliente ?? ""}`.toLowerCase().includes(q)),
    );
  }, [templates, search]);

  return (
    <Layout>
      <main className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Route className="h-6 w-6" /> Templates de Rota
          </h1>
          <p className="text-sm text-muted-foreground">
            Padrões de rota recorrentes salvos a partir da Roteirização. Reutilize para ganhar agilidade.
          </p>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Templates salvos ({templates.length})</CardTitle>
            <CardDescription>Os mais usados aparecem primeiro.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nome, cidade, descrição..."
                className="pl-9"
              />
            </div>

            {isLoading && <div className="text-sm text-muted-foreground">Carregando...</div>}

            {!isLoading && filtered.length === 0 && (
              <div className="text-sm text-muted-foreground border border-dashed rounded-md p-6 text-center">
                Nenhum template encontrado. Crie um na tela de <strong>Roteirização</strong> ao fechar uma carga.
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filtered.map((t) => (
                <div
                  key={t.id}
                  className="rounded-md border border-border bg-muted/20 p-3 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-medium text-sm truncate">{t.nome}</div>
                      {t.descricao && (
                        <div className="text-xs text-muted-foreground truncate">{t.descricao}</div>
                      )}
                    </div>
                    <Badge variant="secondary" className="shrink-0 gap-1 text-[11px]">
                      <Repeat className="h-3 w-3" /> {t.times_used}x
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <MapPin className="h-3 w-3" /> Origem: <strong className="text-foreground">{t.origem}</strong>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t.paradas.length} {t.paradas.length === 1 ? "parada" : "paradas"}
                    {t.tipo_caminhao && (
                      <span className="ml-2">· {t.tipo_caminhao}</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {t.paradas.slice(0, 5).map((p, i) => (
                      <Badge key={i} variant="outline" className="text-[10px]">
                        {p.cidade}/{p.uf}
                      </Badge>
                    ))}
                    {t.paradas.length > 5 && (
                      <Badge variant="outline" className="text-[10px]">+{t.paradas.length - 5}</Badge>
                    )}
                  </div>
                  <div className="flex justify-end pt-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-destructive hover:text-destructive"
                      onClick={() => setToDelete(t)}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" /> Excluir
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>

      <DeleteConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Excluir template"
        description={`Tem certeza que deseja excluir o template "${toDelete?.nome}"? Esta ação não pode ser desfeita.`}
        onConfirm={async () => {
          if (toDelete) await del.mutateAsync(toDelete.id);
          setToDelete(null);
        }}
      />
    </Layout>
  );
}