import { useRef, useState, useEffect } from "react";
import { Camera, RotateCcw, Check, FileText, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PhotoViewerDialog } from "./PhotoViewerDialog";

interface Props {
  label: string;
  onCapture: (file: File, viaArquivo?: boolean) => void;
  disabled?: boolean;
  previewUrl?: string | null;
  accept?: string;
  cameraOnly?: boolean;
  /** Quando true, exibe botão extra "Enviar arquivo" (sem capture=camera).
   *  Use para perfis Admin/Logística regularizarem fotos sem ter a câmera no momento. */
  allowFileUpload?: boolean;
}

export function CapturaFoto({ label, onCapture, disabled, previewUrl, accept = "image/*", cameraOnly = true, allowFileUpload = false }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [isPdf, setIsPdf] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);

  const preview = previewUrl || localPreview;
  const showAsPdf = isPdf || (previewUrl && (previewUrl.includes('.pdf') || previewUrl.includes('application/pdf')));
  const shouldCapture = cameraOnly && !accept.includes("application/pdf");

  useEffect(() => {
    return () => {
      if (localPreview) URL.revokeObjectURL(localPreview);
    };
  }, [localPreview]);

  useEffect(() => {
    if (disabled || shouldCapture) return;
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          e.preventDefault();
          const file = item.getAsFile();
          if (!file) continue;
          if (localPreview) URL.revokeObjectURL(localPreview);
          setIsPdf(false);
          setLocalPreview(URL.createObjectURL(file));
          onCapture(file, true);
          break;
        }
      }
    };
    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [disabled, onCapture, localPreview, shouldCapture]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, viaArquivo = false) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (localPreview) URL.revokeObjectURL(localPreview);
    setIsPdf(file.type === "application/pdf");
    setLocalPreview(URL.createObjectURL(file));
    onCapture(file, viaArquivo);
    e.target.value = "";
  };

  const handleRetake = () => {
    if (localPreview) URL.revokeObjectURL(localPreview);
    setLocalPreview(null);
    setIsPdf(false);
    inputRef.current?.click();
  };

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-foreground">{label}</p>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        capture={shouldCapture ? "environment" : undefined}
        className="hidden"
        onChange={handleChange}
        disabled={disabled}
      />
      {allowFileUpload && (
        <input
          ref={fileInputRef}
          type="file"
          accept={accept.includes("pdf") ? accept : "image/*,application/pdf"}
          className="hidden"
          onChange={handleChange}
          disabled={disabled}
        />
      )}
      {preview ? (
        <div className="relative rounded-lg overflow-hidden border border-border">
          {showAsPdf ? (
            <div
              className="w-full h-48 flex flex-col items-center justify-center gap-2 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => setViewerOpen(true)}
            >
              <FileText className="h-12 w-12 text-muted-foreground" />
              <span className="text-xs text-muted-foreground font-medium">Documento PDF</span>
              <span className="text-[10px] text-primary">Clique para visualizar</span>
            </div>
          ) : (
            <img
              src={preview}
              alt={label}
              className="w-full h-48 object-cover cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => setViewerOpen(true)}
            />
          )}
          <div className="absolute bottom-2 right-2 flex gap-1">
            {allowFileUpload && (
              <Button size="sm" variant="secondary" onClick={() => fileInputRef.current?.click()} disabled={disabled}>
                <Upload className="h-3 w-3 mr-1" /> Arquivo
              </Button>
            )}
            <Button size="sm" variant="secondary" onClick={handleRetake} disabled={disabled}>
              <RotateCcw className="h-3 w-3 mr-1" /> Refazer
            </Button>
          </div>
          <div className="absolute top-2 left-2">
            <div className="bg-accent text-accent-foreground rounded-full p-1">
              <Check className="h-3 w-3" />
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={disabled}
            className={cn(
              "w-full h-48 rounded-lg border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center gap-2 transition-colors",
              "hover:border-primary/50 hover:bg-muted/50",
              disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            <Camera className="h-8 w-8 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{shouldCapture ? "Toque para fotografar" : "Toque para fotografar ou cole (Ctrl+V)"}</span>
          </button>
          {allowFileUpload && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
            >
              <Upload className="h-4 w-4 mr-2" /> Enviar arquivo (Admin/Logística)
            </Button>
          )}
        </div>
      )}
      <PhotoViewerDialog open={viewerOpen} onOpenChange={setViewerOpen} url={preview} alt={label} />
    </div>
  );
}
