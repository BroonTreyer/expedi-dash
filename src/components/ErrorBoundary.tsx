import { Component, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface Props {
  /** Identificador do bloco para logs e mensagem */
  name?: string;
  /** Conteúdo a ser protegido */
  children: ReactNode;
  /** Fallback customizado (opcional) */
  fallback?: (args: { error: Error; reset: () => void }) => ReactNode;
  /** Callback opcional disparado quando ocorre o erro */
  onError?: (error: Error) => void;
}

interface State {
  error: Error | null;
}

/**
 * Captura erros de render de seus filhos e mostra um fallback isolado,
 * impedindo que um único bloco quebrado derrube a página inteira.
 *
 * Use em volta de cada painel/widget independente:
 *   <ErrorBoundary name="No Pátio"><PainelNoPatio .../></ErrorBoundary>
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string }) {
    // Log estruturado — facilita identificar o bloco que falhou nos relatórios
    // sem afetar os demais blocos.
    // eslint-disable-next-line no-console
    console.error(
      `[ErrorBoundary] bloco "${this.props.name ?? "desconhecido"}" falhou:`,
      error,
      info?.componentStack,
    );
    this.props.onError?.(error);
  }

  reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    if (this.props.fallback) {
      return this.props.fallback({ error, reset: this.reset });
    }

    return (
      <Card className="overflow-hidden border-destructive/40 shadow-sm">
        <CardContent className="p-4 flex items-start gap-3">
          <div className="shrink-0 rounded-md bg-destructive/10 p-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <div>
              <p className="text-sm font-semibold text-foreground">
                Não foi possível carregar
                {this.props.name ? ` "${this.props.name}"` : ""}
              </p>
              <p className="text-xs text-muted-foreground break-words">
                {error.message || "Erro inesperado ao renderizar este bloco."}
              </p>
            </div>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={this.reset}>
              <RefreshCw className="h-3.5 w-3.5" /> Tentar novamente
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }
}

