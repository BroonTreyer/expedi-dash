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
  useUpdateMovimentacao,
  uploadFotoMovimentacao,
  type MovimentacaoPortaria,
} from "@/hooks/useMovimentacoesPortaria";
import { processarOCR } from "@/hooks/useRegistrosPortaria";
import { useTiposCaminhao } from "@/hooks/useTiposCaminhao";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ArrowDownToLine, ArrowUpFromLine, ArrowLeft, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import {
  type Categoria,
  type TipoMovimentoPortaria,
  CATEGORIAS_PORTARIA,
  getVisibleBlocks,
  getBlockFields,
  validateForm,
} from "@/lib/portaria-fields-config";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  prefill?: MovimentacaoPortaria | null;
  /** For carga própria stages: "retorno", "lacre", or "saida_rota" */
  prefillEtapa?: "retorno" | "lacre" | "saida_rota" | null;
  prefillFromPlanilha?: Record<string, any> | null;
  onCreated?: (placa: string) => void;
  /** When set, locks the categoria and skips the categoria-selection step */
  forcedCategoria?: Categoria;
}

export function RegistroMovimentoDialog({ open, onOpenChange, prefill, prefillEtapa, prefillFromPlanilha, onCreated, forcedCategoria }: Props) {
  const { user, role } = useAuth();
  const canRegularizar = role === "admin" || role === "logistica";
  const createMov = useCreateMovimentacao();
  const updateMov = useUpdateMovimentacao();
  const { data: tiposCaminhao = [] } = useTiposCaminhao();
  const [step, setStep] = useState<"categoria" | "form">("categoria");
  const [tipo, setTipo] = useState<TipoMovimentoPortaria>("entrada");
  const [categoria, setCategoria] = useState<Categoria>(forcedCategoria ?? "carga_propria");
  const [values, setValues] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [textoPlacaLido, setTextoPlacaLido] = useState<string | null>(null);
  const [confiancaPlaca, setConfiancaPlaca] = useState<number | null>(null);
  const [ocrLacreLoading, setOcrLacreLoading] = useState(false);
  const [textoLacreLido, setTextoLacreLido] = useState<string | null>(null);
  const [confiancaLacre, setConfiancaLacre] = useState<number | null>(null);
  const [regularizar, setRegularizar] = useState(false);
  const [motivoRegularizacao, setMotivoRegularizacao] = useState("");
  const [fotoViaArquivo, setFotoViaArquivo] = useState(false);

  const set = useCallback((key: string, val: any) => {
    setValues((prev) => ({ ...prev, [key]: val }));
  }, []);

  // Determine if this is a carga própria update flow (retorno or lacre)
  const isCargaPropriaUpdate = !!prefill && prefill.categoria === "carga_propria" && (prefillEtapa === "retorno" || prefillEtapa === "lacre" || prefillEtapa === "saida_rota");

  // Reset when opening
  useEffect(() => {
    if (!open) return;
    if (prefill && prefillEtapa === "saida_rota") {
      // Carga própria: saída p/ rota (from chegou stage) — prefill with existing data
      setStep("form");
      setTipo("saida_rota");
      setCategoria("carga_propria");
      setValues({
        placa: prefill.placa || "",
        motorista: prefill.motorista || "",
        rota: prefill.rota || "",
        carga_id: prefill.carga_id || "",
        peso: prefill.peso ?? "",
        qtd_entregas: prefill.qtd_entregas ?? "",
        empresa: prefill.empresa || "",
        tipo_caminhao: prefill.tipo_caminhao || "",
        telefone: prefill.telefone || "",
      });
    } else if (prefill && prefillEtapa === "retorno") {
      // Carga própria retorno stage
      setStep("form");
      setTipo("retorno");
      setCategoria("carga_propria");
      setValues({});
    } else if (prefill && prefillEtapa === "lacre") {
      // Carga própria lacre/final exit stage
      setStep("form");
      setTipo("lacre");
      setCategoria("carga_propria");
      setValues({});
    } else if (prefill) {
      // Legacy: saída for non-carga-própria OR old flow
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
      // No prefill: if forcedCategoria is set, skip selector and go straight to form
      if (forcedCategoria) {
        setStep("form");
        setCategoria(forcedCategoria);
        // Carga própria não tem "entrada" — começa como saída p/ rota
        setTipo(forcedCategoria === "carga_propria" ? "saida_rota" : "entrada");
      } else {
        setStep("categoria");
        setTipo("entrada");
        setCategoria("carga_propria");
      }
      setValues({});
    }
    setOcrLoading(false);
    setTextoPlacaLido(null);
    setConfiancaPlaca(null);
    setOcrLacreLoading(false);
    setTextoLacreLido(null);
    setConfiancaLacre(null);
    setRegularizar(false);
    setMotivoRegularizacao("");
    setFotoViaArquivo(false);
  }, [open, prefill, prefillEtapa, prefillFromPlanilha, forcedCategoria]);

  const effectiveTipo = useMemo(() => {
    return tipo;
  }, [tipo]);

  const blocks = useMemo(() => getVisibleBlocks(categoria, effectiveTipo), [categoria, effectiveTipo]);
  // Fields skipped during regularization (no photos available + KM Inicial pode entrar manual)
  const REGULARIZAR_SKIP = ["foto_painel_url", "foto_lacre_url", "foto_placa_url"];
  const canSave = useMemo(() => {
    if (regularizar) {
      // Validate everything except skipped fields, AND require motivo
      if (!motivoRegularizacao.trim() || motivoRegularizacao.trim().length < 5) return false;
      const valuesForCheck = { ...values };
      REGULARIZAR_SKIP.forEach((k) => { valuesForCheck[k] = valuesForCheck[k] || "__skip__"; });
      return validateForm(categoria, valuesForCheck, effectiveTipo);
    }
    return validateForm(categoria, values, effectiveTipo);
  }, [categoria, values, effectiveTipo, regularizar, motivoRegularizacao]);

  // Show regularizar checkbox only on carga_propria stages where photos block the flow
  const showRegularizarOption = canRegularizar && categoria === "carga_propria" && (
    prefillEtapa === "saida_rota" || prefillEtapa === "retorno" || prefillEtapa === "lacre"
  );

  const handleSelectCategoria = (cat: Categoria) => {
    setCategoria(cat);
    setValues({});
    if (cat === "carga_propria" && tipo === "entrada") {
      // Carga própria não tem "entrada" — o 1º contato é saída p/ rota
      setTipo("saida_rota");
    }
    setStep("form");
  };

  const handleFotoCapture = async (fieldKey: string, file: File, viaArquivo = false) => {
    const tipoFotoMap: Record<string, string> = { foto_placa_url: "placa", foto_painel_url: "painel", foto_nota_url: "nota", foto_documento_url: "doc", foto_lacre_url: "lacre" };
    const tipoFoto = (tipoFotoMap[fieldKey] || "doc") as "placa" | "doc" | "painel" | "nota";
    try {
      const publicUrl = await uploadFotoMovimentacao(file, tipoFoto);
      set(fieldKey, publicUrl);
      if (viaArquivo) setFotoViaArquivo(true);

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

      // OCR for lacre photo
      if (fieldKey === "foto_lacre_url") {
        setOcrLacreLoading(true);
        try {
          const result = await processarOCR(publicUrl, "placa");
          setTextoLacreLido(result.texto);
          setConfiancaLacre(result.confianca);
          if (result.texto) set("numero_lacre", result.texto);
        } catch (e: any) {
          toast.error("Erro no OCR do lacre: " + e.message);
        } finally {
          setOcrLacreLoading(false);
        }
      }

    } catch (e: any) {
      toast.error("Erro ao enviar foto: " + e.message);
    }
  };

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);

    try {
      // Build regularization prefix to append to observacoes (preserves audit)
      const regPrefixReg = regularizar
        ? `[REGULARIZADO por ${user?.email || "usuário"} em ${new Date().toLocaleString("pt-BR")}: ${motivoRegularizacao.trim()}]`
        : "";
      const regPrefixUpload = fotoViaArquivo
        ? `[FOTO via upload por ${user?.email || "usuário"} em ${new Date().toLocaleString("pt-BR")}]`
        : "";
      const regPrefix = [regPrefixReg, regPrefixUpload].filter(Boolean).join("\n");
      const appendReg = (existing: string | null | undefined) => {
        const base = (existing || "").trim();
        if (!regPrefix) return base || null;
        return base ? `${regPrefix}\n${base}` : regPrefix;
      };

      if (isCargaPropriaUpdate && prefill) {
        // UPDATE existing record for saida_rota, retorno or lacre stages
        const updates: Record<string, any> = {};

        if (prefillEtapa === "saida_rota") {
          updates.foto_placa_url = values.foto_placa_url || null;
          updates.foto_painel_saida_url = values.foto_painel_saida_url || null;
          updates.placa = values.placa?.trim().toUpperCase() || prefill.placa || null;
          updates.motorista = values.motorista?.trim() || prefill.motorista || null;
          updates.km_inicial = values.km_inicial ? Number(values.km_inicial) : null;
          updates.rota = values.rota?.trim() || prefill.rota || null;
          updates.texto_placa_lido = textoPlacaLido;
          updates.confianca_placa = confiancaPlaca;
          updates.placa_confirmada = values.placa?.trim().toUpperCase() || null;
          updates.horario_real_saida = new Date().toISOString();
          updates.etapa_carga_propria = "em_rota";
          if (regularizar || fotoViaArquivo) {
            updates.observacoes = appendReg(prefill.observacoes);
          }
        } else if (prefillEtapa === "retorno") {
          updates.foto_painel_url = values.foto_painel_url || null;
          updates.km_final = values.km_final ? Number(values.km_final) : null;
          updates.observacoes = (regularizar || fotoViaArquivo)
            ? appendReg(values.observacoes?.trim() || prefill.observacoes)
            : (values.observacoes?.trim() || prefill.observacoes || null);
          updates.ocorrencia = values.ocorrencia?.trim() || null;
          updates.horario_real_retorno = new Date().toISOString();
          updates.etapa_carga_propria = "retornou";
          // Calculate km_rodado
          if (updates.km_final != null && prefill.km_inicial != null) {
            updates.km_rodado = Number(updates.km_final) - Number(prefill.km_inicial);
          }
        } else if (prefillEtapa === "lacre") {
          updates.foto_lacre_url = values.foto_lacre_url || null;
          updates.numero_lacre = values.numero_lacre?.trim() || null;
          updates.conferente = values.conferente?.trim() || null;
          if (regularizar || fotoViaArquivo) {
            const lacreObs = values.observacoes?.trim();
            const baseObs = lacreObs ? `[Lacre] ${lacreObs}` : "";
            const existing = prefill.observacoes || "";
            const combined = [existing, baseObs].filter(Boolean).join("\n");
            updates.observacoes = appendReg(combined);
          } else if (values.observacoes?.trim()) {
            // Append to existing observacoes
            const existing = prefill.observacoes || "";
            const novo = values.observacoes.trim();
            updates.observacoes = existing ? `${existing}\n[Lacre] ${novo}` : novo;
          }
          // Não sobrescrever horario_real_saida (saída p/ rota); usar campo dedicado
          updates.horario_saida_final = new Date().toISOString();
          updates.etapa_carga_propria = "finalizado";
        }

        await updateMov.mutateAsync({ id: prefill.id, ...updates });
        const savedPlaca = prefill.placa || "";
        if (savedPlaca) onCreated?.(savedPlaca);
        onOpenChange(false);
      } else {
        // CREATE new record
        // Calculate km_rodado for carga_propria (legacy saida with prefill)
        let kmRodado: number | null = null;
        const kmInicialSource = tipo === "saida" && prefill?.km_inicial != null ? prefill.km_inicial : values.km_inicial;
        if (categoria === "carga_propria" && values.km_final && kmInicialSource != null) {
          kmRodado = Number(values.km_final) - Number(kmInicialSource);
        }

        // Determine tipo_movimento for DB
        let dbTipoMovimento = tipo === "entrada" ? "entrada" : "saida";
        // For carga_propria new entry (1ª saída), create as "saida" with etapa
        const isCargaPropriaPrimeiraSaida = categoria === "carga_propria" && !prefillEtapa;
        if (isCargaPropriaPrimeiraSaida) {
          dbTipoMovimento = "saida";
        }

        await createMov.mutateAsync({
          tipo_movimento: dbTipoMovimento,
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
          observacoes: appendReg(values.observacoes?.trim() || null),
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
          foto_painel_saida_url: values.foto_painel_saida_url || null,
          foto_nota_url: values.foto_nota_url || null,
          foto_lacre_url: values.foto_lacre_url || null,
          tipo_caminhao: values.tipo_caminhao?.trim() || null,
          // Carga própria 1ª saída
          ...(isCargaPropriaPrimeiraSaida ? {
            etapa_carga_propria: "em_rota",
            horario_real_saida: new Date().toISOString(),
          } : {}),
          // Terceirizado: já entra no pátio (logística autoriza antes)
          ...(categoria === "terceirizado" && tipo === "entrada" ? {
            horario_chegada: new Date().toISOString(),
            horario_entrada: new Date().toISOString(),
            etapa_terceirizado: "no_patio",
          } : {}),
        } as any);
        // Close terceirizado entrada cycle when this is its saída
        if (prefill && prefill.categoria === "terceirizado" && dbTipoMovimento === "saida") {
          await updateMov.mutateAsync({
            id: prefill.id,
            etapa_terceirizado: "finalizado",
            horario_real_saida: new Date().toISOString(),
          });
          // Atualiza status da carga vinculada para "Carregado" no Consolidado
          const cargaIdVinculada = prefill.carga_id;
          if (cargaIdVinculada) {
            try {
              const { error: updErr } = await supabase
                .from("carregamentos_dia")
                .update({ status: "Carregado" })
                .eq("carga_id", cargaIdVinculada)
                .neq("status", "Carregado");
              if (updErr) console.error("Erro ao atualizar status da carga:", updErr);
              else toast.info("Carga marcada como Carregado");
            } catch (e) {
              console.error("Erro ao atualizar status da carga:", e);
            }
          }
        }
        const savedPlaca = values.placa?.trim().toUpperCase() || "";
        if (savedPlaca) onCreated?.(savedPlaca);
        onOpenChange(false);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => onOpenChange(false);

  const categoriaLabel = CATEGORIAS_PORTARIA.find((c) => c.value === categoria)?.label || categoria;

  // Title and description based on flow
  const getDialogDescription = () => {
    if (prefillEtapa === "saida_rota" && prefill) return `Registrar saída p/ rota do veículo ${prefill.placa}`;
    if (prefillEtapa === "retorno" && prefill) return `Registrar retorno do veículo ${prefill.placa}`;
    if (prefillEtapa === "lacre" && prefill) return `Registrar lacre e saída final do veículo ${prefill.placa}`;
    if (prefill && prefill.categoria === "terceirizado") return `Finalizar saída c/ lacre do veículo ${prefill.placa}`;
    if (prefill) return `Registrar saída do veículo ${prefill.placa}`;
    if (prefillFromPlanilha) {
      if (prefillFromPlanilha.categoria === "carga_propria") return `Registrar saída p/ rota do veículo ${prefillFromPlanilha.placa}`;
      return `Conferir entrada do veículo ${prefillFromPlanilha.placa}`;
    }
    return `Preencha os dados de ${tipo === "entrada" ? "entrada" : "saída"}`;
  };

  const getDialogTitle = () => {
    if (prefillEtapa === "saida_rota") return "Saída p/ Rota";
    if (prefillEtapa === "retorno") return "Registrar Retorno";
    if (prefillEtapa === "lacre") return "Saída Final — Lacre";
    if (prefill && prefill.categoria === "terceirizado") return "Registrar Saída — Terceirizado";
    return `Cadastro de ${categoriaLabel}`;
  };

  const getSaveButtonLabel = () => {
    if (prefillEtapa === "saida_rota") return "Registrar Saída p/ Rota";
    if (prefillEtapa === "retorno") return "Registrar Retorno";
    if (prefillEtapa === "lacre") return "Finalizar c/ Lacre";
    if (prefill && prefill.categoria === "terceirizado") return "Finalizar Saída c/ Lacre";
    if (categoria === "carga_propria" && !prefill) return "Registrar Saída p/ Rota";
    return `Registrar ${tipo === "entrada" ? "Entrada" : "Saída"}`;
  };

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
                  <ArrowUpFromLine className="h-4 w-4" /> Saída
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">Para Carga Própria, selecione a categoria abaixo — será registrado como Saída p/ Rota automaticamente.</p>
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
                {!prefill && !forcedCategoria && (
                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => setStep("categoria")}>
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                )}
                {getDialogTitle()}
              </DialogTitle>
              <DialogDescription>{getDialogDescription()}</DialogDescription>
            </DialogHeader>

            {/* Show info banner for retorno/lacre */}
            {isCargaPropriaUpdate && prefill && (
              <div className="rounded-md bg-muted/50 p-2.5 text-sm space-y-0.5">
                <div><span className="text-muted-foreground">Placa:</span> <strong>{prefill.placa}</strong></div>
                <div><span className="text-muted-foreground">Motorista:</span> <strong>{prefill.motorista || "—"}</strong></div>
                {prefill.rota && <div><span className="text-muted-foreground">Rota:</span> <strong>{prefill.rota}</strong></div>}
                {(prefill.peso != null || prefill.qtd_entregas != null) && (
                  <div className="flex gap-3">
                    {prefill.peso != null && <span><span className="text-muted-foreground">Peso:</span> <strong>{prefill.peso} kg</strong></span>}
                    {prefill.qtd_entregas != null && <span><span className="text-muted-foreground">Entregas:</span> <strong>{prefill.qtd_entregas}</strong></span>}
                  </div>
                )}
                {prefillEtapa === "retorno" && prefill.km_inicial != null && (
                  <div><span className="text-muted-foreground">KM Inicial:</span> <strong>{prefill.km_inicial}</strong></div>
                )}
              </div>
            )}

            {showRegularizarOption && (
              <div className="rounded-md border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 p-3 space-y-2">
                <div className="flex items-start gap-2">
                  <Checkbox
                    id="regularizar"
                    checked={regularizar}
                    onCheckedChange={(v) => setRegularizar(v === true)}
                  />
                  <div className="flex-1">
                    <Label htmlFor="regularizar" className="text-sm font-medium cursor-pointer flex items-center gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                      Regularizar sem foto
                    </Label>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Use quando a portaria deixou o veículo passar sem capturar a evidência. Fica registrado quem regularizou e por quê.
                    </p>
                  </div>
                </div>
                {regularizar && (
                  <div className="space-y-1.5 pl-6">
                    <Label htmlFor="motivo-reg" className="text-xs">Motivo da regularização <span className="text-destructive">*</span></Label>
                    <Textarea
                      id="motivo-reg"
                      value={motivoRegularizacao}
                      onChange={(e) => setMotivoRegularizacao(e.target.value)}
                      placeholder="Ex: Portaria liberou sem fotografar o painel — KM informado pelo motorista por telefone."
                      rows={2}
                      className="text-sm"
                    />
                    {motivoRegularizacao.trim().length > 0 && motivoRegularizacao.trim().length < 5 && (
                      <p className="text-[11px] text-destructive">Motivo muito curto.</p>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="space-y-5">
              {blocks.map((block) => {
                const fields = getBlockFields(categoria, block.key, effectiveTipo);
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
                                  if (d.transportadora) set("empresa", d.transportadora);
                                  if (d.destino_setor) set("destino_setor", d.destino_setor);
                                  if (d.tipo_caminhao) set("tipo_caminhao", d.tipo_caminhao);
                                  if (d.telefone) set("telefone", d.telefone);
                                }}
                                disabled={saving || (!!prefill && prefillEtapa !== "saida_rota")}
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
                                  if (m.placa) set("placa", m.placa);
                                  if (m.tipo_caminhao) set("tipo_caminhao", m.tipo_caminhao);
                                  if (m.transportadora) set("empresa", m.transportadora);
                                }}
                                disabled={saving || (!!prefill && prefillEtapa !== "saida_rota")}
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
                                onCapture={(file, viaArquivo) => handleFotoCapture(field.key, file, viaArquivo)}
                                previewUrl={values[field.key] || null}
                                disabled={saving}
                                allowFileUpload={canRegularizar}
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

              {/* KM Rodado calculated display for retorno */}
              {(() => {
                if (prefillEtapa === "retorno" && prefill?.km_inicial != null && values.km_final) {
                  const rodado = Number(values.km_final) - Number(prefill.km_inicial);
                  const kmRota = prefill.km_rota;
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
                }
                // Legacy: km display for old saida flow
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
                {getSaveButtonLabel()}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
