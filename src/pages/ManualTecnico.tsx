import { useEffect, useMemo, useState } from "react";
import { CAPITULOS } from "@/content/manual/capitulos";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Warn } from "@/components/manual/MdxBlocks";
import { cn } from "@/lib/utils";
import { Printer, Search } from "lucide-react";

export default function ManualTecnico() {
  const [busca, setBusca] = useState("");
  const [ativoId, setAtivoId] = useState(CAPITULOS[0]?.id ?? "");
  const [modo, setModo] = useState<"leigo" | "dev">("leigo");

  useEffect(() => {
    const prev = document.title;
    document.title = "Manual Técnico — FricoTrack";
    return () => {
      document.title = prev;
    };
  }, []);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return CAPITULOS;
    return CAPITULOS.filter(
      (c) =>
        c.titulo.toLowerCase().includes(q) ||
        c.resumo.toLowerCase().includes(q) ||
        c.buscaTexto.toLowerCase().includes(q),
    );
  }, [busca]);

  const ativo = CAPITULOS.find((c) => c.id === ativoId) ?? CAPITULOS[0];

  return (
    <>
      <main className="min-h-dvh bg-background">
        <div className="border-b bg-card print:hidden">
          <div className="max-w-7xl mx-auto px-4 py-4 flex flex-wrap items-center gap-3">
            <div>
              <h1 className="text-xl font-bold">Manual Técnico — FricoTrack</h1>
              <p className="text-xs text-muted-foreground">
                Handover completo: do operacional ao código. Use <kbd className="px-1 border rounded">Ctrl/Cmd+P</kbd> para gerar PDF.
              </p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Tabs value={modo} onValueChange={(v) => setModo(v as "leigo" | "dev")}>
                <TabsList>
                  <TabsTrigger value="leigo">Para entender</TabsTrigger>
                  <TabsTrigger value="dev">Para o dev</TabsTrigger>
                </TabsList>
              </Tabs>
              <Button variant="outline" size="sm" onClick={() => window.print()}>
                <Printer className="h-4 w-4 mr-2" /> Imprimir / PDF
              </Button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 md:grid-cols-[280px_1fr] gap-6">
          <aside className="print:hidden">
            <div className="relative mb-3">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar capítulo…"
                className="pl-8"
              />
            </div>
            <nav className="space-y-1 max-h-[calc(100vh-220px)] overflow-y-auto pr-1">
              {filtrados.map((c) => {
                const Icon = c.icone;
                const active = c.id === ativo?.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => setAtivoId(c.id)}
                    className={cn(
                      "w-full text-left flex items-start gap-2 rounded-md px-2 py-2 text-sm transition-colors",
                      active
                        ? "bg-accent text-accent-foreground"
                        : "hover:bg-muted text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Icon className="h-4 w-4 mt-0.5 shrink-0" />
                    <span className="flex-1">
                      <span className="block font-medium">
                        {c.numero}. {c.titulo}
                      </span>
                      <span className="block text-[11px] opacity-70 line-clamp-2">{c.resumo}</span>
                    </span>
                  </button>
                );
              })}
              {filtrados.length === 0 && (
                <p className="text-xs text-muted-foreground px-2 py-3">Nenhum capítulo encontrado.</p>
              )}
            </nav>
          </aside>

          <article className="min-w-0">
            <section className="print:hidden">
              {ativo && (
                <Card className="p-6 md:p-8">
                  <header className="mb-4 pb-4 border-b">
                    <p className="text-xs uppercase tracking-widest text-muted-foreground">
                      Capítulo {ativo.numero}
                    </p>
                    <h2 className="text-2xl font-bold">{ativo.titulo}</h2>
                    <p className="text-sm text-muted-foreground mt-1">{ativo.resumo}</p>
                  </header>
                  <Tabs value={modo} onValueChange={(v) => setModo(v as "leigo" | "dev")}>
                    <TabsContent value="leigo" className="mt-0">{ativo.leigo}</TabsContent>
                    <TabsContent value="dev" className="mt-0">{ativo.dev}</TabsContent>
                  </Tabs>
                  {ativo.atencao && (
                    <div className="mt-6">
                      <Warn>{ativo.atencao}</Warn>
                    </div>
                  )}
                </Card>
              )}
            </section>

            <section className="hidden print:block space-y-10">
              <header className="mb-6">
                <h2 className="text-3xl font-bold">Manual Técnico — FricoTrack</h2>
                <p className="text-sm text-muted-foreground">
                  Documento completo gerado em {new Date().toLocaleDateString("pt-BR")}.
                </p>
              </header>
              {CAPITULOS.map((c) => (
                <section key={c.id} className="break-before-page">
                  <h3 className="text-2xl font-bold border-b pb-2 mb-3">
                    {c.numero}. {c.titulo}
                  </h3>
                  <p className="italic text-sm mb-4">{c.resumo}</p>
                  <h4 className="text-lg font-semibold mt-4 mb-2">Para entender</h4>
                  <div>{c.leigo}</div>
                  <h4 className="text-lg font-semibold mt-6 mb-2">Para o desenvolvedor</h4>
                  <div>{c.dev}</div>
                  {c.atencao && (
                    <>
                      <h4 className="text-lg font-semibold mt-6 mb-2">Atenção</h4>
                      <div>{c.atencao}</div>
                    </>
                  )}
                </section>
              ))}
            </section>
          </article>
        </div>
      </main>

      <style>{`
        @media print {
          @page { size: A4; margin: 14mm; }
          body { background: #fff !important; }
          .break-before-page { break-before: page; }
        }
      `}</style>
    </>
  );
}