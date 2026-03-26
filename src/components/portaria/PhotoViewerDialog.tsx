import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  url: string | null;
  alt?: string;
}

export function PhotoViewerDialog({ open, onOpenChange, url, alt }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] p-2 sm:p-4">
        <DialogTitle className="sr-only">{alt || "Foto"}</DialogTitle>
        <div className="flex items-center justify-center w-full h-full">
          {url ? (
            <img
              src={url}
              alt={alt || "Foto"}
              className="max-w-full max-h-[85vh] object-contain rounded-md"
            />
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
