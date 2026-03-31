import { useState, useEffect, useCallback, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CapturaFoto } from "./CapturaFoto";
import { OcrResultado } from "./OcrResultado";
import { PlacaInput } from "./PlacaInput";
import { MotoristaAutocomplete } from "./MotoristaAutocomplete";
import {
  useCreateMovimentacao,
  uploadFotoMovimentacao,
  type MovimentacaoPortaria,
} from "@/hooks/useMovimentacoesPortaria";
import { processarOCR } from "@/hooks/useRegistrosPortaria";
import { useTiposCaminhao } from "@/hooks/useTiposCaminhao";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, ArrowDownToLine, ArrowUpFromLine, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import {
  type Categoria,
  CATEGORIAS_PORTARIA,
  getVisibleBlocks,
  getBlockFields,
  validateForm,
} from "@/lib/portaria-fields-config";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  prefill?: MovimentacaoPortaria | null;
  prefillFromPlanilha?: Record<string, any> | null;
  onCreated?: (placa: string) => void;
}

export function RegistroMovimentoDialog({ open, onOpenChange, prefill, prefillFromPlanilha, onCreated }: Props) {
  const { user } = useAuth();
  const createMov = useCreateMovimentacao();
  const { data: tiposCaminhao = [] } = useTiposCaminhao();
  const [step, setStep] = useState<"categoria" | "form">("categoria");
  const [tipo, setTipo] = useState<"entrada" | "saida">("entrada");
  const [categoria, setCategoria] = useState<Categoria>("carga_propria");
  const [values, setValues] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [textoPlacaLido, setTextoPlacaLido] = useState<string | null>(null);
  const [confiancaPlaca, setConfiancaPlaca] = useState<number | null>(null);
  const [ocrLacreLoading, setOcrLacreLoading] = useState(false);
  const [textoLacreLido, setTextoLacreLido] = useState<string | null>(null);
  const [confiancaLacre, setConfiancaLacre] = useState<number | null>(null);

  const set = useCallback((key: string, val: any) => {
    setValues((prev) => ({ ...prev, [key]: val }));
  }, []);

  // Reset when opening
  useEffect(() => {
    if (!open) return;
    if (prefill) {
      setStep("form");
      setTipo("saida");
      setCategoria((prefill.categoria as Categoria) || "carga_propria");
      setValues({
        placa: prefill.placa || "",
        motorista: prefill.motorista || "",
        empresa: prefill.empresa || "",
        carga_id: prefill.carga_id || "",
      });
    } else if (prefillFromPlanilha) {
      setStep("form");
      setTipo(prefillFromPlanilha.tipo || "entrada");
      setCategoria((prefillFromPlanilha.categoria as Categoria) || "carga_propria");
      setValues({
        placa: prefillFromPlanilha.placa || "",
        motorista: prefillFromPlanilha.motorista || "",
        empresa: prefillFromPlanilha.empresa || "",
        carga_id: prefillFromPlanilha.carga_id || "",
        rota: prefillFromPlanilha.rota || "",
        peso: prefillFromPlanilha.peso ?? "",
        qtd_entregas: prefillFromPlanilha.qtd_entregas ?? "",
      });
    } else {
      setStep("categoria");
      setTipo("entrada");
      setCategoria("carga_propria");
      setValues({});
    }
    setOcrLoading(false);
    setTextoPlacaLido(null);
    setConfiancaPlaca(null);
    setOcrLacreLoading(false);
    setTextoLacreLido(null);
    setConfiancaLacre(null);
  }, [open, prefill, prefillFromPlanilha]);

  const blocks = useMemo(() => getVisibleBlocks(categoria, tipo), [categoria, tipo]);
  const canSave = useMemo(() => validateForm(categoria, values, tipo), [categoria, values, tipo]);

  const handleSelectCategoria = (cat: Categoria) => {
    setCategoria(cat);
    setValues({});
    setStep("form");
  };

  const handleFotoCapture = async (fieldKey: string, file: File) => {
    const tipoFotoMap: Record<string, string> = { foto_placa_url: "placa", foto_painel_url: "painel", foto_nota_url: "nota", foto_documento_url: "doc", foto_lacre_url: "lacre" };
    const tipoFoto = (tipoFotoMap[fieldKey] || "doc") as "placa" | "doc" | "painel" | "nota";
    try {
      const publicUrl = await uploadFotoMovimentacao(file, tipoFoto);
      set(fieldKey, publicUrl);

      // OCR for placa photo
      if (fieldKey === "foto_placa_url") {
        setOcrLoading(true);
        try {
          const result = await processarOCR(publicUrl, "placa");
          setTextoPlacaLido(result.texto);
          setConfiancaPlaca(result.confianca);
          set("placa", result.texto);
        } catch (e: any) {
          toast.error("Erro no OCR: " + e.message);
        } finally {
          setOcrLoading(false);
        }
      }

    } catch (e: any) {
      toast.error("Erro ao enviar foto: " + e.message);
    }
  };

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);

    // Calculate km_rodado for carga_propria
    let kmRodado: number | null = null;
    const kmInicialSource = tipo === "saida" && prefill?.km_inicial != null ? prefill.km_inicial : values.km_inicial;
    if (categoria === "carga_propria" && values.km_final && kmInicialSource != null) {
      kmRodado = Number(values.km_final) - Number(kmInicialSource);
    }

    try {
      await createMov.mutateAsync({
        tipo_movimento: tipo,
        categoria,
        placa: values.placa?.trim().toUpperCase() || null,
        motorista: values.motorista?.trim() || null,
        empresa: values.empresa?.trim() || null,
        destino_setor: values.destino_setor?.trim() || values.doca_setor?.trim() || null,
        motivo: null,
        carga_id: values.carga_id?.trim() || null,
        foto_placa_url: values.foto_placa_url || null,
        texto_placa_lido: textoPlacaLido,
        confianca_placa: confiancaPlaca,
        placa_confirmada: values.placa?.trim().toUpperCase() || null,
        foto_documento_url: values.foto_documento_url || null,
        observacoes: values.observacoes?.trim() || null,
        usuario_id: user?.id ?? null,
        movimento_vinculado_id: prefill?.id || null,
        // New fields
        tipo_operacao: values.tipo_operacao || null,
        documento: values.documento?.trim() || null,
        nome_completo: values.nome_completo?.trim() || null,
        rota: values.rota?.trim() || null,
        peso: values.peso ? Number(values.peso) : null,
        qtd_entregas: values.qtd_entregas ? Number(values.qtd_entregas) : null,
        km_rota: values.km_rota ? Number(values.km_rota) : null,
        km_inicial: values.km_inicial ? Number(values.km_inicial) : null,
        km_final: values.km_final ? Number(values.km_final) : null,
        km_rodado: kmRodado,
        apelido: values.apelido?.trim() || null,
        conferente: values.conferente?.trim() || null,
        ocorrencia: values.ocorrencia?.trim() || null,
        nota_fiscal: values.nota_fiscal?.trim() || null,
        servico_executar: values.servico_executar?.trim() || null,
        responsavel_interno: values.responsavel_interno?.trim() || null,
        pessoa_visitada: values.pessoa_visitada?.trim() || null,
        motivo_visita: values.motivo_visita?.trim() || null,
        telefone: values.telefone?.trim() || null,
        descricao: values.descricao?.trim() || null,
        tipo_carga: values.tipo_carga?.trim() || null,
        numero_lacre: values.numero_lacre?.trim() || null,
        doca_setor: values.doca_setor?.trim() || null,
        foto_painel_url: values.foto_painel_url || null,
        foto_nota_url: values.foto_nota_url || null,
        foto_lacre_url: values.foto_lacre_url || null,
        tipo_caminhao: values.tipo_caminhao?.trim() || null,
        // Terceirizado 3-stage fields
        ...(categoria === "terceirizado" && tipo === "entrada" ? {
          horario_chegada: new Date().toISOString(),
          etapa_terceirizado: "aguardando",
        } : {}),
      } as any);
      const savedPlaca = values.placa?.trim().toUpperCase() || "";
      if (savedPlaca) onCreated?.(savedPlaca);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => onOpenChange(false);

  const categoriaLabel = CATEGORIAS_PORTARIA.find((c) => c.value === categoria)?.label || categoria;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); else onOpenChange(v); }}>
      <DialogContent className="max-w-lg w-[calc(100vw-2rem)] sm:w-full max-h-[95vh] overflow-y-auto">
        {step === "categoria" && !prefill ? (
          <>
            <DialogHeader>
              <DialogTitle>Registrar Movimento</DialogTitle>
              <DialogDescription>Selecione a categoria do veículo/pessoa</DialogDescription>
            </DialogHeader>

            {/* Tipo de movimento */}
            <div className="space-y-1.5">
              <Label>Tipo de Movimento</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button type="button" variant={tipo === "entrada" ? "default" : "outline"} className="gap-2" onClick={() => setTipo("entrada")}>
                  <ArrowDownToLine className="h-4 w-4" /> Entrada
                </Button>
                <Button type="button" variant={tipo === "saida" ? "default" : "outline"} className="gap-2" onClick={() => setTipo("saida")}>
                  <ArrowUpFromLine className="h-4 w-4" /> Retorno
                </Button>
              </div>
            </div>

            {/* Category cards */}
            <div className="grid grid-cols-2 gap-2 pt-2">
              {CATEGORIAS_PORTARIA.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => handleSelectCategoria(cat.value)}
                  className="flex flex-col items-start gap-1 p-3 rounded-lg border border-border bg-card hover:border-primary hover:bg-primary/5 transition-colors text-left"
                >
                  <span className="text-xl">{cat.icon}</span>
                  <span className="text-sm font-semibold text-foreground">{cat.label}</span>
                  <span className="text-[11px] text-muted-foreground leading-tight">{cat.description}</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {!prefill && (
                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => setStep("categoria")}>
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                )}
                Cadastro de {categoriaLabel}
              </DialogTitle>
              <DialogDescription>
                {prefill ? `Registrar retorno do veículo ${prefill.placa}` : prefillFromPlanilha ? `Conferir entrada do veículo ${prefillFromPlanilha.placa}` : `Preencha os dados de ${tipo === "entrada" ? "entrada" : "retorno"}`}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5">
              {blocks.map((block) => {
                const fields = getBlockFields(categoria, block.key, tipo);
                if (fields.length === 0) return null;

                return (
                  <div key={block.key} className="space-y-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <span>{block.icon}</span> {block.label}
                    </h3>

                    <div className="space-y-3">
                      {fields.map((field) => {
                        // Special: placa uses PlacaInput
                        if (field.key === "placa") {
                          return (
                            <div key={field.key} className="space-y-1.5">
                              <PlacaInput
                                value={values.placa || ""}
                                onChange={(v) => set("placa", v)}
                                onAutofill={(d) => {
                                  if (d.motorista) set("motorista", d.motorista);
                                  if (d.empresa) set("empresa", d.empresa);
                                  if (d.destino_setor) set("destino_setor", d.destino_setor);
                                }}
                                disabled={saving || !!prefill}
                              />
                              {field.required && !values.placa?.trim() && (
                                <p className="text-[11px] text-destructive">* Obrigatório</p>
                              )}
                            </div>
                          );
                        }

                        // Motorista autocomplete
                        if (field.key === "motorista") {
                          return (
                            <div key={field.key} className="space-y-1.5">
                              <Label>{field.label} {field.required && <span className="text-destructive">*</span>}</Label>
                              <MotoristaAutocomplete
                                value={values.motorista || ""}
                                onChange={(v) => set("motorista", v)}
                                onSelect={(m) => {
                                  if (m.telefone) set("telefone", m.telefone);
                                }}
                                disabled={saving || !!prefill}
                              />
                              {field.required && !values.motorista?.trim() && (
                                <p className="text-[11px] text-destructive">* Obrigatório</p>
                              )}
                            </div>
                          );
                        }

                        // Photo fields
                        if (field.type === "photo") {
                          return (
                            <div key={field.key} className="space-y-1.5">
                              <CapturaFoto
                                label={field.label}
                                onCapture={(file) => handleFotoCapture(field.key, file)}
                                previewUrl={values[field.key] || null}
                                disabled={saving}
                              />
                              {field.required && !values[field.key] && (
                                <p className="text-[11px] text-destructive">* Obrigatório</p>
                              )}
                              {/* OCR result for placa photo */}
                              {field.key === "foto_placa_url" && (ocrLoading || textoPlacaLido !== null) && (
                                <OcrResultado
                                  label="Leitura da Placa"
                                  textoLido={textoPlacaLido}
                                  confianca={confiancaPlaca}
                                  valorConfirmado={values.placa || ""}
                                  onChange={(v) => set("placa", v)}
                                  loading={ocrLoading}
                                  disabled={saving}
                                />
                              )}
                              {/* OCR result for lacre photo */}
                              {field.key === "foto_lacre_url" && (ocrLacreLoading || textoLacreLido !== null) && (
                                <OcrResultado
                                  label="Leitura do Lacre"
                                  textoLido={textoLacreLido}
                                  confianca={confiancaLacre}
                                  valorConfirmado={values.numero_lacre || ""}
                                  onChange={(v) => set("numero_lacre", v)}
                                  loading={ocrLacreLoading}
                                  disabled={saving}
                                />
                              )}
                            </div>
                          );
                        }

                        // Select fields — dynamic for tipo_caminhao
                        if (field.key === "tipo_caminhao") {
                          return (
                            <div key={field.key} className="space-y-1.5">
                              <Label>{field.label} {field.required && <span className="text-destructive">*</span>}</Label>
                              <Select value={values[field.key] || ""} onValueChange={(v) => set(field.key, v)}>
                                <SelectTrigger><SelectValue placeholder="Selecione o tipo..." /></SelectTrigger>
                                <SelectContent>
                                  {tiposCaminhao.map((t) => (
                                    <SelectItem key={t.id} value={t.nome_tipo}>{t.nome_tipo}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          );
                        }

                        // Select fields
                        if (field.type === "select" && field.options) {
                          return (
                            <div key={field.key} className="space-y-1.5">
                              <Label>{field.label} {field.required && <span className="text-destructive">*</span>}</Label>
                              <Select value={values[field.key] || ""} onValueChange={(v) => set(field.key, v)}>
                                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                <SelectContent>
                                  {field.options.map((o) => (
                                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          );
                        }

                        // Textarea
                        if (field.type === "textarea") {
                          return (
                            <div key={field.key} className="space-y-1.5">
                              <Label>{field.label} {field.required && <span className="text-destructive">*</span>}</Label>
                              <Textarea
                                value={values[field.key] || ""}
                                onChange={(e) => set(field.key, e.target.value)}
                                placeholder={field.placeholder}
                                disabled={saving}
                                rows={2}
                              />
                            </div>
                          );
                        }

                        // Text / Number inputs
                        return (
                          <div key={field.key} className="space-y-1.5">
                            <Label>{field.label} {field.required && <span className="text-destructive">*</span>}</Label>
                            <Input
                              type={field.type === "number" ? "number" : "text"}
                              value={values[field.key] ?? ""}
                              onChange={(e) => set(field.key, field.type === "number" ? e.target.value : e.target.value)}
                              placeholder={field.placeholder}
                              disabled={saving}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* KM Rodado calculated display */}
              {(() => {
                const kmIni = tipo === "saida" && prefill?.km_inicial != null ? prefill.km_inicial : values.km_inicial;
                if (!(categoria === "carga_propria" && values.km_final && kmIni != null)) return null;
                const rodado = Number(values.km_final) - Number(kmIni);
                const kmRota = values.km_rota || (tipo === "saida" ? prefill?.km_rota : null);
                return (
                  <div className="rounded-md bg-muted/50 p-3 text-sm">
                    <span className="text-muted-foreground">KM Rodado: </span>
                    <span className="font-semibold">{rodado.toFixed(0)} km</span>
                    {kmRota && (
                      <span className="text-muted-foreground ml-2">
                        (Rota: {kmRota} km — {Math.abs(rodado - Number(kmRota)).toFixed(0)} km de diferença)
                      </span>
                    )}
                  </div>
                );
              })()}
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              {!canSave && !saving && (
                <p className="text-[11px] text-destructive mr-auto">Preencha todos os campos obrigatórios (*)</p>
              )}
              <Button variant="outline" onClick={handleClose} disabled={saving}>Cancelar</Button>
              <Button onClick={handleSave} disabled={!canSave || saving || ocrLoading || ocrLacreLoading}>
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                Registrar {tipo === "entrada" ? "Entrada" : "Retorno"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
