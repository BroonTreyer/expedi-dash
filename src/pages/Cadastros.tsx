import { useMemo, useState, useEffect } from "react";
import { useSearchParams, useNavigate, useLocation } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, User, Truck, Tag, CheckCircle2, Plus, X, Building2 } from "lucide-react";
import { useMotoristas, useCreateMotorista, useUpdateMotorista, type Motorista } from "@/hooks/useMotoristas";
import { useCaminhoes, useCreateCaminhao, useUpdateCaminhao, type Caminhao } from "@/hooks/useCaminhoes";
import { useTiposCaminhao, useCreateTipoCaminhao } from "@/hooks/useTiposCaminhao";
import { TransportadorasTab } from "@/components/cadastros/TransportadorasTab";
import { toast } from "sonner";
import { maskCPF, maskPhone } from "@/lib/masks";

type EditingMotorista = { id?: string; nome_completo: string; cpf: string; telefone: string; fotoFile?: File; fotoMotoristaFile?: File; foto_motorista_url?: string | null; foto_documento_url?: string | null };
type EditingCaminhao = { id?: string; placa: string; renavam: string; tipo_caminhao: string; transportadora: string; motorista_id: string | null };

const emptyMot: EditingMotorista = { nome_completo: "", cpf: "", telefone: "" };
const emptyCam: EditingCaminhao = { placa: "", renavam: "", tipo_caminhao: "", transportadora: "", motorista_id: null };

export default function Cadastros() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isBuscarMode = searchParams.get("focus") === "buscar";
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [novoTipo, setNovoTipo] = useState("");
  const [mot, setMot] = useState<EditingMotorista>(emptyMot);
  const [cam, setCam] = useState<EditingCaminhao>(emptyCam);

  // Pickup pre-loaded record from search-mode navigation
  useEffect(() => {
    const state = location.state as { motorista?: EditingMotorista; caminhao?: EditingCaminhao } | null;
    if (state?.motorista) setMot(state.motorista);
    if (state?.caminhao) setCam(state.caminhao);
    if (state?.motorista || state?.caminhao) {
      toast.info("Cadastro carregado para edição");
      // Clear navigation state so refresh doesn't repopulate
      window.history.replaceState({}, "");
    }
  }, [location.state]);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data: motoristas = [] } = useMotoristas(debounced || undefined);
  const { data: caminhoes = [] } = useCaminhoes(debounced || undefined);
  const { data: tipos = [] } = useTiposCaminhao();

  const createMot = useCreateMotorista();
  const updateMot = useUpdateMotorista();
  const createCam = useCreateCaminhao();
  const updateCam = useUpdateCaminhao();
  const createTipo = useCreateTipoCaminhao();

  const tiposFiltrados = useMemo(() => {
    if (!debounced) return [];
    const s = debounced.toLowerCase();
    return tipos.filter((t: any) => t.nome_tipo.toLowerCase().includes(s));
  }, [tipos, debounced]);

  const hasResults = motoristas.length > 0 || caminhoes.length > 0 || tiposFiltrados.length > 0;

  function selectMotorista(m: Motorista) {
    navigate("/cadastros", {
      state: {
        motorista: { id: m.id, nome_completo: m.nome_completo, cpf: m.cpf ?? "", telefone: m.telefone ?? "", foto_motorista_url: m.foto_motorista_url, foto_documento_url: m.foto_documento_url },
      },
    });
  }

  function selectCaminhao(c: Caminhao) {
    navigate("/cadastros", {
      state: {
        caminhao: {
          id: c.id,
          placa: c.placa,
          renavam: c.renavam ?? "",
          tipo_caminhao: c.tipo_caminhao ?? "",
          transportadora: c.transportadora ?? "",
          motorista_id: c.motorista_id ?? null,
        },
        motorista: c.motorista
          ? { id: c.motorista.id, nome_completo: c.motorista.nome_completo, cpf: c.motorista.cpf ?? "", telefone: c.motorista.telefone ?? "" }
          : undefined,
      },
    });
  }

  function clearForm() {
    setMot(emptyMot);
    setCam(emptyCam);
    setNovoTipo("");
    setSearch("");
  }

  async function handleSave() {
    const motFilled = mot.nome_completo.trim().length > 0;
    const camFilled = cam.placa.trim().length > 0;
    const tipoFilled = novoTipo.trim().length > 0;

    if (!motFilled && !camFilled && !tipoFilled) {
      toast.error("Preencha pelo menos uma seção (Motorista, Caminhão ou Tipo)");
      return;
    }

    try {
      let motoristaIdFinal = mot.id ?? cam.motorista_id ?? null;
      let tipoFinal = cam.tipo_caminhao;

      // 1) Tipo novo
      if (tipoFilled) {
        const exists = tipos.find((t: any) => t.nome_tipo.toLowerCase() === novoTipo.trim().toLowerCase());
        if (!exists) {
          await createTipo.mutateAsync({ nome_tipo: novoTipo.trim() });
        }
        if (!tipoFinal) tipoFinal = novoTipo.trim();
      }

      // 2) Motorista
      if (motFilled) {
        if (mot.id) {
          await updateMot.mutateAsync({
            id: mot.id,
            nome_completo: mot.nome_completo.trim(),
            cpf: mot.cpf,
            telefone: mot.telefone,
            fotoFile: mot.fotoFile,
            fotoMotoristaFile: mot.fotoMotoristaFile,
          });
          motoristaIdFinal = mot.id;
        } else {
          const novo = await createMot.mutateAsync({
            nome_completo: mot.nome_completo.trim(),
            cpf: mot.cpf,
            telefone: mot.telefone,
            fotoFile: mot.fotoFile,
            fotoMotoristaFile: mot.fotoMotoristaFile,
          });
          motoristaIdFinal = novo.id;
        }
      }

      // 3) Caminhão
      if (camFilled) {
        if (cam.id) {
          await updateCam.mutateAsync({
            id: cam.id,
            placa: cam.placa,
            renavam: cam.renavam,
            tipo_caminhao: tipoFinal,
            motorista_id: motoristaIdFinal,
            transportadora: cam.transportadora,
          });
        } else {
          await createCam.mutateAsync({
            placa: cam.placa,
            renavam: cam.renavam,
            tipo_caminhao: tipoFinal,
            motorista_id: motoristaIdFinal,
            transportadora: cam.transportadora,
          });
        }
      }

      toast.success("Cadastro salvo com sucesso");
      clearForm();
    } catch (e: any) {
      toast.error(e.message || "Erro ao salvar");
    }
  }

  const isPending = createMot.isPending || updateMot.isPending || createCam.isPending || updateCam.isPending || createTipo.isPending;

  return (
    <Layout>
      <main className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">{isBuscarMode ? "Buscar / Consultar" : "Cadastros"}</h1>
          <p className="text-sm text-muted-foreground">
            {isBuscarMode
              ? "Verifique se um motorista, caminhão ou tipo já está cadastrado."
              : "Cadastre motoristas, caminhões e tipos em um único lugar."}
          </p>
        </div>

        <Tabs defaultValue="unificado" className="space-y-4">
          <TabsList>
            <TabsTrigger value="unificado"><User className="h-4 w-4 mr-2" />Motorista / Caminhão</TabsTrigger>
            <TabsTrigger value="transportadoras"><Building2 className="h-4 w-4 mr-2" />Transportadoras</TabsTrigger>
          </TabsList>

          <TabsContent value="unificado" className="space-y-6">
            {isBuscarMode && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Search className="h-4 w-4" /> Buscar / Consultar
              </CardTitle>
              <CardDescription>Digite nome, CPF, placa ou tipo de caminhão. Clique no resultado para editar.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  autoFocus
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por nome, CPF, placa ou tipo..."
                  className="pl-9"
                />
              </div>

              {debounced && (
                <div className="space-y-3">
                  {!hasResults && (
                    <div className="text-sm text-muted-foreground border border-dashed rounded-md p-3">
                      Nenhum cadastro encontrado para "<strong>{debounced}</strong>".{" "}
                      <button
                        type="button"
                        className="text-primary underline underline-offset-2"
                        onClick={() => navigate("/cadastros")}
                      >
                        Criar novo cadastro
                      </button>
                    </div>
                  )}

                  {motoristas.length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-2 flex items-center gap-1">
                        <User className="h-3 w-3" /> Motoristas ({motoristas.length})
                      </h3>
                      <div className="space-y-1">
                        {motoristas.slice(0, 5).map((m) => (
                          <button
                            key={m.id}
                            onClick={() => selectMotorista(m)}
                            className="w-full text-left p-2 rounded-md border hover:bg-accent flex items-center justify-between gap-2"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              {m.foto_motorista_url ? (
                                <img src={m.foto_motorista_url} alt={m.nome_completo} className="h-9 w-9 rounded-full object-cover border shrink-0" />
                              ) : (
                                <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground shrink-0">
                                  {m.nome_completo.split(" ").slice(0, 2).map(s => s[0]).join("").toUpperCase()}
                                </div>
                              )}
                              <div className="min-w-0">
                                <div className="text-sm font-medium truncate">{m.nome_completo}</div>
                                <div className="text-xs text-muted-foreground">
                                  {m.cpf || "—"} · {m.telefone || "—"}
                                </div>
                              </div>
                            </div>
                            <Badge variant="secondary" className="shrink-0"><CheckCircle2 className="h-3 w-3 mr-1" />Cadastrado</Badge>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {caminhoes.length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-2 flex items-center gap-1">
                        <Truck className="h-3 w-3" /> Caminhões ({caminhoes.length})
                      </h3>
                      <div className="space-y-1">
                        {caminhoes.slice(0, 5).map((c) => (
                          <button
                            key={c.id}
                            onClick={() => selectCaminhao(c)}
                            className="w-full text-left p-2 rounded-md border hover:bg-accent flex items-center justify-between gap-2"
                          >
                            <div className="min-w-0">
                              <div className="text-sm font-medium truncate">{c.placa} {c.tipo_caminhao && <span className="text-muted-foreground font-normal">· {c.tipo_caminhao}</span>}</div>
                              <div className="text-xs text-muted-foreground truncate">
                                {c.motorista?.nome_completo ?? "Sem motorista"} {c.transportadora && `· ${c.transportadora}`}
                              </div>
                            </div>
                            <Badge variant="secondary" className="shrink-0"><CheckCircle2 className="h-3 w-3 mr-1" />Cadastrado</Badge>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {tiposFiltrados.length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-2 flex items-center gap-1">
                        <Tag className="h-3 w-3" /> Tipos de caminhão ({tiposFiltrados.length})
                      </h3>
                      <div className="flex flex-wrap gap-1">
                        {tiposFiltrados.map((t: any) => (
                          <Badge key={t.id} variant="outline">{t.nome_tipo}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="pt-2">
                <Button variant="outline" size="sm" onClick={() => navigate("/cadastros")}>
                  <Plus className="h-4 w-4 mr-1" /> Ir para Cadastro
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {!isBuscarMode && (
          <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Cadastro Unificado</CardTitle>
              <CardDescription>Preencha apenas as seções que deseja salvar. Os dados são gravados em tabelas separadas.</CardDescription>
            </div>
            {(mot.id || cam.id) && (
              <Button variant="ghost" size="sm" onClick={clearForm}>
                <X className="h-4 w-4 mr-1" /> Limpar
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Motorista */}
            <section>
              <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                <User className="h-4 w-4" /> Motorista {mot.id && <Badge variant="outline" className="ml-1">Editando</Badge>}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="md:col-span-2">
                  <Label>Nome completo *</Label>
                  <Input value={mot.nome_completo} onChange={(e) => setMot({ ...mot, nome_completo: e.target.value })} placeholder="Nome do motorista" />
                </div>
                <div>
                  <Label>CPF</Label>
                  <Input value={mot.cpf} onChange={(e) => setMot({ ...mot, cpf: maskCPF(e.target.value) })} placeholder="000.000.000-00" />
                </div>
                <div>
                  <Label>Telefone</Label>
                  <Input value={mot.telefone} onChange={(e) => setMot({ ...mot, telefone: maskPhone(e.target.value) })} placeholder="(00) 00000-0000" />
                </div>
                <div>
                  <Label>Foto do motorista (rosto)</Label>
                  <Input type="file" accept="image/*" capture="environment" onChange={(e) => setMot({ ...mot, fotoMotoristaFile: e.target.files?.[0] })} />
                  <p className="text-[11px] text-muted-foreground mt-1">Somente câmera traseira</p>
                  {mot.foto_motorista_url && !mot.fotoMotoristaFile && (
                    <a href={mot.foto_motorista_url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block">
                      <img src={mot.foto_motorista_url} alt="Motorista" className="h-16 w-16 rounded-md object-cover border" />
                    </a>
                  )}
                </div>
                <div>
                  <Label>Foto do documento</Label>
                  <Input type="file" accept="image/*" capture="environment" onChange={(e) => setMot({ ...mot, fotoFile: e.target.files?.[0] })} />
                  <p className="text-[11px] text-muted-foreground mt-1">Somente câmera traseira</p>
                  {mot.foto_documento_url && !mot.fotoFile && (
                    <a href={mot.foto_documento_url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-xs text-primary underline">
                      Ver documento atual
                    </a>
                  )}
                </div>
              </div>
            </section>

            <Separator />

            {/* Caminhão */}
            <section>
              <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                <Truck className="h-4 w-4" /> Caminhão {cam.id && <Badge variant="outline" className="ml-1">Editando</Badge>}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label>Placa *</Label>
                  <Input value={cam.placa} onChange={(e) => setCam({ ...cam, placa: e.target.value.toUpperCase() })} placeholder="ABC1D23" maxLength={8} />
                </div>
                <div>
                  <Label>RENAVAM</Label>
                  <Input value={cam.renavam} onChange={(e) => setCam({ ...cam, renavam: e.target.value })} placeholder="00000000000" />
                </div>
                <div>
                  <Label>Transportadora</Label>
                  <Input value={cam.transportadora} onChange={(e) => setCam({ ...cam, transportadora: e.target.value })} placeholder="Nome da transportadora" />
                </div>
                <div>
                  <Label>Tipo de caminhão</Label>
                  <Select value={cam.tipo_caminhao || undefined} onValueChange={(v) => setCam({ ...cam, tipo_caminhao: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
                    <SelectContent>
                      {tipos.map((t: any) => (
                        <SelectItem key={t.id} value={t.nome_tipo}>{t.nome_tipo}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </section>

            <Separator />

            {/* Novo tipo */}
            <section>
              <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                <Tag className="h-4 w-4" /> Criar novo tipo de caminhão (opcional)
              </h3>
              <div className="flex gap-2">
                <Input value={novoTipo} onChange={(e) => setNovoTipo(e.target.value)} placeholder="Ex: Truck, Toco, Carreta..." />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Será criado se não existir. Útil para usar imediatamente no campo "Tipo de caminhão" acima.
              </p>
            </section>

            <Separator />

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={clearForm} disabled={isPending}>Cancelar</Button>
              <Button onClick={handleSave} disabled={isPending}>
                <Plus className="h-4 w-4 mr-1" /> {isPending ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </CardContent>
        </Card>
        )}
          </TabsContent>

          <TabsContent value="transportadoras">
            <TransportadorasTab />
          </TabsContent>
        </Tabs>
      </main>
    </Layout>
  );
}
