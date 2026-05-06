import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Search, Plus, Trash2, Loader2, Users, ChevronRight, Check } from "lucide-react";
import {
  useTabelasFrete, useTabelaFreteItens, useVendedoresPorTabela, useTabelasContagens,
  useCriarTabela, useExcluirTabela, useUpsertItem, useExcluirItem, useVincularVendedores,
  type TabelaFreteItem,
} from "@/hooks/useTabelasFrete";
import { useVendedores } from "@/hooks/useVendedores";
import { useClientes } from "@/hooks/useClientes";
import { toast } from "sonner";

export function TabelaFreteTab() {
  const { data: tabelas = [], isLoading } = useTabelasFrete();
  const { data: contagens } = useTabelasContagens();
  const [selId, setSelId] = useState<string | null>(null);
  const [novoOpen, setNovoOpen] = useState(false);
  const [novoNome, setNovoNome] = useState("");
  const [novoDesc, setNovoDesc] = useState("");
  const criar = useCriarTabela();
  const excluirTab = useExcluirTabela();

  const sel = tabelas.find((t) => t.id === selId) ?? null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
      <Card className="p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="font-semibold text-sm">Tabelas de frete</div>
          <Button size="sm" onClick={() => setNovoOpen(true)}><Plus className="h-4 w-4 mr-1" /> Nova</Button>
        </div>
        {isLoading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : tabelas.length === 0 ? (
          <div className="text-xs text-muted-foreground py-6 text-center">Nenhuma tabela criada ainda.</div>
        ) : (
          <ul className="space-y-1">
            {tabelas.map((t) => {
              const ic = contagens?.itens.get(t.id) ?? 0;
              const vc = contagens?.vendedores.get(t.id) ?? 0;
              const active = t.id === selId;
              return (
                <li key={t.id}>
                  <button
                    onClick={() => setSelId(t.id)}
                    className={`w-full text-left rounded-md border px-3 py-2 hover:bg-muted/50 transition ${active ? "bg-muted border-primary" : ""}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-sm truncate">{t.nome}</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      {ic} destino(s) · {vc} vendedor(es)
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {sel ? (
        <TabelaDetalhe
          key={sel.id}
          tabelaId={sel.id}
          nome={sel.nome}
          onExcluir={() => {
            if (!confirm(`Excluir a tabela "${sel.nome}"? Todas as linhas e vínculos serão removidos.`)) return;
            excluirTab.mutate(sel.id, { onSuccess: () => setSelId(null) });
          }}
        />
      ) : (
        <Card className="p-6 flex items-center justify-center text-sm text-muted-foreground min-h-[200px]">
          Selecione uma tabela à esquerda ou crie uma nova.
        </Card>
      )}

      <Dialog open={novoOpen} onOpenChange={setNovoOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova tabela de frete</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Nome</Label>
              <Input value={novoNome} onChange={(e) => setNovoNome(e.target.value)} placeholder="Ex.: Premium NE" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Descrição (opcional)</Label>
              <Input value={novoDesc} onChange={(e) => setNovoDesc(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setNovoOpen(false)}>Cancelar</Button>
            <Button
              onClick={async () => {
                if (!novoNome.trim()) return toast.error("Informe o nome");
                const t = await criar.mutateAsync({ nome: novoNome.trim(), descricao: novoDesc.trim() || undefined });
                setNovoOpen(false); setNovoNome(""); setNovoDesc("");
                setSelId(t.id);
              }}
            >Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TabelaDetalhe({ tabelaId, nome, onExcluir }: { tabelaId: string; nome: string; onExcluir: () => void }) {
  const { data: itens = [], isLoading } = useTabelaFreteItens(tabelaId);
  const { data: vinc = [] } = useVendedoresPorTabela(tabelaId);
  const { data: vendedores = [] } = useVendedores();
  const upsert = useUpsertItem();
  const excluir = useExcluirItem();
  const vincular = useVincularVendedores();
  const { data: clientes = [] } = useClientes();
  const clientesByCodigo = useMemo(() => {
    const m = new Map<string, { nome: string; cidade: string | null; uf: string | null }>();
    for (const c of clientes as any[]) {
      m.set(String(c.codigo_cliente).trim(), {
        nome: c.nome_cliente,
        cidade: c.cidade ?? null,
        uf: c.uf ?? null,
      });
    }
    return m;
  }, [clientes]);

  const [q, setQ] = useState("");
  const [novo, setNovo] = useState({ codigo_cliente: "", destino_cidade: "", destino_uf: "", b: "0", c: "0" });
  const [vendOpen, setVendOpen] = useState(false);

  const novoClienteInfo = useMemo(() => {
    const code = novo.codigo_cliente.trim();
    if (!code) return null;
    return clientesByCodigo.get(code) ?? ("missing" as const);
  }, [novo.codigo_cliente, clientesByCodigo]);

  const vinculadosIds = useMemo(() => new Set(vinc.map((v) => v.vendedor_id)), [vinc]);
  const vendedoresVinculados = useMemo(
    () => vendedores.filter((v: any) => vinculadosIds.has(v.id)),
    [vendedores, vinculadosIds],
  );

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return itens;
    return itens.filter((i) =>
      (i.destino_cidade ?? "").toLowerCase().includes(term)
      || i.destino_uf.toLowerCase().includes(term)
      || (i.codigo_cliente ?? "").toLowerCase().includes(term),
    );
  }, [itens, q]);

  const adicionar = () => {
    if (!novo.destino_uf.trim()) return toast.error("Informe a UF");
    upsert.mutate({
      tabela_id: tabelaId,
      codigo_cliente: novo.codigo_cliente,
      destino_cidade: novo.destino_cidade,        // pode ser vazio → vira null no hook
      destino_uf: novo.destino_uf,
      valor_kg_bitruck: Number(novo.b) || 0,
      valor_kg_carreta: Number(novo.c) || 0,
    } as any);
    setNovo({ codigo_cliente: "", destino_cidade: "", destino_uf: "", b: "0", c: "0" });
  };

  const salvarLinha = (i: TabelaFreteItem, patch: Partial<TabelaFreteItem>) => {
    upsert.mutate({ ...i, ...patch } as any);
  };

  const toggleVend = (vid: string) => {
    const next = new Set(vinculadosIds);
    if (next.has(vid)) next.delete(vid); else next.add(vid);
    vincular.mutate({ tabela_id: tabelaId, vendedorIds: Array.from(next) });
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <div className="font-semibold">{nome}</div>
          <div className="text-xs text-muted-foreground">{itens.length} destino(s) · {vinc.length} vendedor(es) vinculado(s)</div>
        </div>
        <div className="flex gap-2">
          <Popover open={vendOpen} onOpenChange={setVendOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm"><Users className="h-4 w-4 mr-1" /> Vincular vendedores</Button>
            </PopoverTrigger>
            <PopoverContent className="w-[320px] p-0" align="end">
              <Command>
                <CommandInput placeholder="Buscar vendedor..." />
                <CommandList>
                  <CommandEmpty>Nenhum vendedor</CommandEmpty>
                  <CommandGroup>
                    {vendedores.map((v: any) => {
                      const on = vinculadosIds.has(v.id);
                      return (
                        <CommandItem key={v.id} value={`${v.codigo_vendedor} ${v.nome_vendedor}`} onSelect={() => toggleVend(v.id)}>
                          <Check className={`h-4 w-4 mr-2 ${on ? "opacity-100" : "opacity-0"}`} />
                          <span className="text-xs text-muted-foreground mr-2">{v.codigo_vendedor}</span>
                          <span className="truncate">{v.nome_vendedor}</span>
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          <Button variant="ghost" size="sm" onClick={onExcluir}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>

      {vendedoresVinculados.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {vendedoresVinculados.map((v: any) => (
            <Badge key={v.id} variant="secondary" className="text-[11px] gap-1">
              {v.nome_vendedor}
              <button onClick={() => toggleVend(v.id)} className="ml-1 text-muted-foreground hover:text-destructive">×</button>
            </Badge>
          ))}
        </div>
      )}

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar destino ou código de cliente..." value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : (
        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-32">Cód. cliente</TableHead>
                <TableHead>Destino</TableHead>
                <TableHead className="w-20 text-center">UF</TableHead>
                <TableHead className="w-32">Bitruck (R$/kg)</TableHead>
                <TableHead className="w-32">Carreta (R$/kg)</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow className="bg-muted/30">
                <TableCell>
                  <Input placeholder="(qualquer)" className="h-8" value={novo.codigo_cliente}
                    onChange={(e) => setNovo({ ...novo, codigo_cliente: e.target.value })} />
                </TableCell>
                <TableCell>
                  <Input placeholder="Cidade (opcional = UF inteira)" className="h-8" value={novo.destino_cidade}
                    onChange={(e) => setNovo({ ...novo, destino_cidade: e.target.value })} />
                </TableCell>
                <TableCell>
                  <Input placeholder="UF" maxLength={2} className="h-8 px-2 text-center uppercase" value={novo.destino_uf}
                    onChange={(e) => setNovo({ ...novo, destino_uf: e.target.value.toUpperCase() })} />
                </TableCell>
                <TableCell>
                  <Input type="number" step="0.01" className="h-8" value={novo.b}
                    onChange={(e) => setNovo({ ...novo, b: e.target.value })} />
                </TableCell>
                <TableCell>
                  <Input type="number" step="0.01" className="h-8" value={novo.c}
                    onChange={(e) => setNovo({ ...novo, c: e.target.value })} />
                </TableCell>
                <TableCell>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={adicionar}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-6">
                  {itens.length === 0 ? "Adicione destinos acima." : "Nenhuma linha corresponde à busca."}
                </TableCell></TableRow>
              )}
              {filtered.map((i) => (
                <TableRow key={i.id}>
                  <TableCell>
                    <Input className="h-8" defaultValue={i.codigo_cliente ?? ""}
                      placeholder="(qualquer)"
                      onBlur={(e) => {
                        const v = e.target.value.trim();
                        if ((i.codigo_cliente ?? "") !== v) salvarLinha(i, { codigo_cliente: v || null });
                      }} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Input className="h-8" defaultValue={i.destino_cidade ?? ""}
                        placeholder="(UF inteira)"
                        onBlur={(e) => {
                          const v = e.target.value.trim();
                          if (v !== (i.destino_cidade ?? "")) salvarLinha(i, { destino_cidade: v || null } as any);
                        }} />
                      {!i.destino_cidade && (
                        <Badge variant="outline" className="text-[10px] shrink-0">UF inteira</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                     <Input className="h-8 px-2 text-center uppercase" maxLength={2} defaultValue={i.destino_uf}
                      onBlur={(e) => { const v = e.target.value.toUpperCase(); if (v !== i.destino_uf) salvarLinha(i, { destino_uf: v }); }} />
                  </TableCell>
                  <TableCell>
                    <Input type="number" step="0.01" className="h-8" defaultValue={i.valor_kg_bitruck}
                      onBlur={(e) => { const v = Number(e.target.value) || 0; if (v !== Number(i.valor_kg_bitruck)) salvarLinha(i, { valor_kg_bitruck: v }); }} />
                  </TableCell>
                  <TableCell>
                    <Input type="number" step="0.01" className="h-8" defaultValue={i.valor_kg_carreta}
                      onBlur={(e) => { const v = Number(e.target.value) || 0; if (v !== Number(i.valor_kg_carreta)) salvarLinha(i, { valor_kg_carreta: v }); }} />
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-7 w-7"
                      onClick={() => { if (confirm("Remover esta linha?")) excluir.mutate({ id: i.id, tabela_id: tabelaId }); }}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </Card>
  );
}
