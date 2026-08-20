import { Component, ReactNode } from "react";

const isChunkError = (msg: string) =>
  /Failed to fetch dynamically imported module/i.test(msg) ||
  /Loading chunk [\d]+ failed/i.test(msg) ||
  /Importing a module script failed/i.test(msg) ||
  /ChunkLoadError/i.test(msg);

const RELOAD_KEY = "__chunk_boundary_reload";

/**
 * Captura falhas de import dinâmico (chunks obsoletos após deploy) que quebram
 * o render das rotas lazy e recarrega a página com cache-bust, evitando tela branca.
 */
export class ChunkErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    if (!isChunkError(error?.message ?? "")) return;
    let attempts = 0;
    try {
      attempts = Number(sessionStorage.getItem(RELOAD_KEY) ?? "0");
      sessionStorage.setItem(RELOAD_KEY, String(attempts + 1));
    } catch {
      /* ignore */
    }
    if (attempts >= 2) return; // evita loop infinito
    const hardReload = async () => {
      try {
        if ("caches" in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map((k) => caches.delete(k).catch(() => {})));
        }
      } catch {
        /* ignore */
      }
      try {
        const url = new URL(window.location.href);
        url.searchParams.set("_r", Date.now().toString(36));
        window.location.replace(url.toString());
      } catch {
        window.location.reload();
      }
    };
    hardReload();
  }

  render() {
    if (this.state.error && isChunkError(this.state.error.message ?? "")) {
      return (
        <div className="flex min-h-screen items-center justify-center p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Atualizando para a versão mais recente…
          </p>
        </div>
      );
    }
    if (this.state.error) throw this.state.error;
    return this.props.children;
  }
}