import { useRef, useState, useEffect } from "react";
import { Camera, RotateCcw, Check, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PhotoViewerDialog } from "./PhotoViewerDialog";

interface Props {
  label: string;
  onCapture: (file: File) => void;
  disabled?: boolean;
  previewUrl?: string | null;
  accept?: string;
  cameraOnly?: boolean;
}

export function CapturaFoto({ label, onCapture, disabled, previewUrl, accept = "image/*" }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [isPdf, setIsPdf] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);

  const preview = previewUrl || localPreview;
  const showAsPdf = isPdf || (previewUrl && (previewUrl.includes('.pdf') || previewUrl.includes('application/pdf')));

  useEffect(() => {
    return () => {
      if (localPreview) URL.revokeObjectURL(localPreview);
    };
  }, [localPreview]);

  useEffect(() => {
    if (disabled) return;
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
          onCapture(file);
          break;
        }
      }
    };
    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [disabled, onCapture, localPreview]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (localPreview) URL.revokeObjectURL(localPreview);
    setIsPdf(file.type === "application/pdf");
    setLocalPreview(URL.createObjectURL(file));
    onCapture(file);
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
        className="hidden"
        onChange={handleChange}
        disabled={disabled}
      />
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
          <span className="text-sm text-muted-foreground">Toque para fotografar ou cole (Ctrl+V)</span>
        </button>
      )}
      <PhotoViewerDialog open={viewerOpen} onOpenChange={setViewerOpen} url={preview} alt={label} />
    </div>
  );
}
