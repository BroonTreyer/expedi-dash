import { useRef, useState, useEffect } from "react";
import { Camera, RotateCcw, Check, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  label: string;
  onCapture: (file: File) => void;
  disabled?: boolean;
  previewUrl?: string | null;
  accept?: string;
}

export function CapturaFoto({ label, onCapture, disabled, previewUrl }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);

  const preview = previewUrl || localPreview;

  // Cleanup ObjectURL on unmount or when localPreview changes
  useEffect(() => {
    return () => {
      if (localPreview) URL.revokeObjectURL(localPreview);
    };
  }, [localPreview]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Revoke previous local URL before creating new one
    if (localPreview) URL.revokeObjectURL(localPreview);
    setLocalPreview(URL.createObjectURL(file));
    onCapture(file);
    // reset input so same file can be re-selected
    e.target.value = "";
  };

  const handleRetake = () => {
    if (localPreview) URL.revokeObjectURL(localPreview);
    setLocalPreview(null);
    inputRef.current?.click();
  };

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-foreground">{label}</p>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleChange}
        disabled={disabled}
      />
      {preview ? (
        <div className="relative rounded-lg overflow-hidden border border-border">
          <img src={preview} alt={label} className="w-full h-48 object-cover" />
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
          <span className="text-sm text-muted-foreground">Toque para fotografar</span>
        </button>
      )}
    </div>
  );
}
