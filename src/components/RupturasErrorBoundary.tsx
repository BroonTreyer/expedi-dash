import { Component, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface Props { children: ReactNode }
interface State { error: Error | null }

export class RupturasErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    // Log com prefixo para facilitar busca no replay/console
    console.error("[Rupturas] Render error:", error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-[60vh] flex items-center justify-center p-6">
          <div className="max-w-lg w-full rounded-lg border border-rose-200 dark:border-rose-900 bg-rose-50/40 dark:bg-rose-950/20 p-6 space-y-4">
            <div className="flex items-center gap-2 text-rose-700 dark:text-rose-300">
              <AlertTriangle className="h-6 w-6" />
              <h2 className="text-lg font-semibold">Não foi possível carregar a página de Rupturas</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Ocorreu um erro ao montar a tela. Tente recarregar — se persistir, peça suporte com a mensagem abaixo:
            </p>
            <pre className="text-xs bg-background/60 border rounded p-3 max-h-40 overflow-auto whitespace-pre-wrap break-words">
              {this.state.error.message || String(this.state.error)}
            </pre>
            <div className="flex gap-2">
              <Button onClick={() => window.location.reload()} variant="default">Recarregar</Button>
              <Button onClick={this.handleReset} variant="outline">Tentar novamente</Button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}