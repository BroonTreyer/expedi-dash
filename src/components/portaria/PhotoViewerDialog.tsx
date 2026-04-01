import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { X, ExternalLink, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  url: string | null;
  alt?: string;
}

function isPdfUrl(url: string) {
  const lower = url.toLowerCase();
  return lower.includes('.pdf') || lower.includes('application/pdf');
}

export function PhotoViewerDialog({ open, onOpenChange, url, alt }: Props) {
  const isPdf = url ? isPdfUrl(url) : false;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] p-2 sm:p-4">
        <DialogTitle className="sr-only">{alt || "Foto"}</DialogTitle>
        <div className="flex flex-col items-center justify-center w-full h-full gap-2">
          {url ? (
            isPdf ? (
              <div className="w-full flex flex-col items-center gap-3">
                <iframe
                  src={url}
                  className="w-full h-[75vh] rounded-md border border-border"
                  title={alt || "Documento PDF"}
                />
                <a href={url} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                    <ExternalLink className="h-3.5 w-3.5" /> Abrir em nova aba
                  </Button>
                </a>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <img
                  src={url}
                  alt={alt || "Foto"}
                  className="max-w-full max-h-[80vh] object-contain rounded-md"
                />
                <a href={url} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                    <ExternalLink className="h-3.5 w-3.5" /> Abrir em nova aba
                  </Button>
                </a>
              </div>
            )
          ) : (
            <p className="text-sm text-muted-foreground">Nenhuma foto disponível</p>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2"
          onClick={() => onOpenChange(false)}
        >
          <X className="h-4 w-4" />
        </Button>
      </DialogContent>
    </Dialog>
  );
}
