import { useWalkInPendentesCount } from "@/hooks/useVeiculosEsperados";
import { cn } from "@/lib/utils";

interface Props {
  collapsed?: boolean;
}

/**
 * Badge numérico exibido ao lado do item "Registro de Entrada" no menu lateral.
 * - Verde pulsante quando há walk-ins LIBERADOS aguardando o porteiro.
 * - Âmbar quando só há aguardando vínculo da Logística.
 */
export function RegistroEntradaBadge({ collapsed }: Props) {
  const { data } = useWalkInPendentesCount();
  const total = data?.total ?? 0;
  if (total === 0) return null;

  const liberados = data?.liberados ?? 0;
  const aguardando = data?.aguardando ?? 0;
  const hasLiberados = liberados > 0;
  const title = `${aguardando} aguardando vínculo · ${liberados} liberado(s)`;

  if (collapsed) {
    return (
      <span
        title={title}
        className={cn(
          "absolute top-1 right-1 h-2 w-2 rounded-full ring-2 ring-sidebar",
          hasLiberados ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
        )}
      />
    );
  }

  return (
    <span
      title={title}
      className={cn(
        "ml-auto inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full text-[10px] font-bold tabular-nums",
        hasLiberados
          ? "bg-emerald-500 text-white animate-pulse"
          : "bg-amber-500 text-white"
      )}
    >
      {total}
    </span>
  );
}
