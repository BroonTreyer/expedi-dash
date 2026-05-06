import { lazy, Suspense, useEffect, type ComponentType } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuthState, AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SuperAdminRoute } from "@/components/SuperAdminRoute";

// Auth is kept eager since it's the landing page (LCP)
import Auth from "./pages/Auth";

// Retry helper for dynamic imports — recovers from stale chunks after deploy/HMR
const routeFactories: Record<string, () => Promise<{ default: ComponentType<unknown> }>> = {};

const lazyWithRetry = <T extends ComponentType<unknown>>(
  name: string,
  factory: () => Promise<{ default: T }>,
  retries = 2,
  delay = 400,
) => {
  routeFactories[name] = factory as () => Promise<{ default: ComponentType<unknown> }>;
  return lazy(async () => {
    let lastErr: unknown;
    for (let i = 0; i <= retries; i++) {
      try {
        return await factory();
      } catch (err) {
        lastErr = err;
        await new Promise((r) => setTimeout(r, delay * (i + 1)));
      }
    }
    // Final attempt: hard reload to fetch fresh asset manifest
    if (typeof window !== "undefined") {
      window.location.reload();
    }
    throw lastErr;
  });
};

/** Pré-carrega o chunk de uma rota (idempotente — o browser cacheia o módulo). */
export function prefetchRoute(name: string) {
  const f = routeFactories[name];
  if (f) f().catch(() => {});
}

// Lazy-loaded routes
const Index = lazyWithRetry("/", () => import("./pages/Index"));
const Produtos = lazyWithRetry("/produtos", () => import("./pages/Produtos"));
const Vendedores = lazyWithRetry("/vendedores", () => import("./pages/Vendedores"));
const TiposCaminhao = lazyWithRetry("/tipos-caminhao", () => import("./pages/TiposCaminhao"));
const Usuarios = lazyWithRetry("/usuarios", () => import("./pages/Usuarios"));
const Rupturas = lazyWithRetry("/rupturas", () => import("./pages/Rupturas"));
const Clientes = lazyWithRetry("/clientes", () => import("./pages/Clientes"));
const Consolidado = lazyWithRetry("/consolidado", () => import("./pages/Consolidado"));
const PortariaCargaPropria = lazyWithRetry("/portaria", () => import("./pages/PortariaCargaPropria"));
const PortariaTerceirizado = lazyWithRetry("/portaria/terceirizado", () => import("./pages/PortariaTerceirizado"));
const PortariaManual = lazyWithRetry("/portaria/manual", () => import("./pages/PortariaManual"));
const PortariaAdmin = lazyWithRetry("/portaria/admin", () => import("./pages/PortariaAdmin"));
const Expedicao = lazyWithRetry("/expedicao", () => import("./pages/Expedicao"));
const RegistroEntrada = lazyWithRetry("/portaria/registro-entrada", () => import("./pages/RegistroEntrada"));
const Motoristas = lazyWithRetry("/motoristas", () => import("./pages/Motoristas"));
const MotoristasPainel = lazyWithRetry("/motoristas-painel", () => import("./pages/MotoristasPainel"));
const Caminhoes = lazyWithRetry("/caminhoes", () => import("./pages/Caminhoes"));
const Cadastros = lazyWithRetry("/cadastros", () => import("./pages/Cadastros"));
const Analytics = lazyWithRetry("/analytics", () => import("./pages/Analytics"));
const Backups = lazyWithRetry("/backups", () => import("./pages/Backups"));
const Relatorios = lazyWithRetry("/relatorios", () => import("./pages/Relatorios"));
const Logs = lazyWithRetry("/logs", () => import("./pages/Logs"));
const Lixeira = lazyWithRetry("/lixeira", () => import("./pages/Lixeira"));
const PortalMotorista = lazyWithRetry("/portal", () => import("./pages/PortalMotorista"));
const TemplatesRota = lazyWithRetry("/templates-rota", () => import("./pages/TemplatesRota"));
const Ocorrencias = lazyWithRetry("/ocorrencias", () => import("./pages/Ocorrencias"));
const Logistica = lazyWithRetry("/logistica", () => import("./pages/Logistica"));
const ManualTecnico = lazyWithRetry("/manual-tecnico", () => import("./pages/ManualTecnico"));
const NotFound = lazyWithRetry("/404", () => import("./pages/NotFound"));
const MeuPainel = lazyWithRetry("/meu-painel", () => import("./pages/MeuPainel"));
const VendedoresPainel = lazyWithRetry("/vendedores-painel", () => import("./pages/VendedoresPainel"));
const Aprovacoes = lazyWithRetry("/aprovacoes", () => import("./pages/Aprovacoes"));

/** Barra de progresso fina no topo (não bloqueia o layout). */
const PageFallback = () => (
  <div className="fixed top-0 left-0 right-0 z-[100] h-0.5 bg-primary/20 overflow-hidden">
    <div className="h-full w-1/3 bg-primary animate-[loading_1s_ease-in-out_infinite]" />
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10_000,
      gcTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error: unknown) => {
        const queryError = error as { message?: string; status?: number; code?: number | string } | null;
        const msg = queryError?.message?.toLowerCase?.() ?? "";
        const status = queryError?.status ?? queryError?.code;
        if (status === 401 || status === 403 || msg.includes("jwt") || msg.includes("refresh_token")) {
          // Don't retry auth errors aggressively — just fail and let auth handler redirect
          return false;
        }
        return failureCount < 2;
      },
    },
  },
});

function AppRoutes() {
  const auth = useAuthState();

  // Pré-carrega rotas mais usadas após login, em idle, para tornar a navegação instantânea.
  useEffect(() => {
    if (!auth?.session) return;
    const idle = (cb: () => void) => {
      const ric = (window as any).requestIdleCallback;
      if (ric) ric(cb, { timeout: 2000 });
      else setTimeout(cb, 800);
    };
    idle(() => {
      ["/", "/rupturas", "/clientes", "/consolidado", "/logistica", "/expedicao", "/meu-painel", "/portaria", "/analytics", "/relatorios"]
        .forEach((r) => prefetchRoute(r));
    });
  }, [auth?.session]);

  return (
    <AuthProvider value={auth}>
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/portal/:token" element={<PortalMotorista />} />
          <Route path="/" element={<ProtectedRoute allowedRoles={["admin", "logistica", "faturamento"]}><Index /></ProtectedRoute>} />
          <Route path="/produtos" element={<ProtectedRoute allowedRoles={["admin", "logistica", "faturamento"]}><Produtos /></ProtectedRoute>} />
          <Route path="/vendedores" element={<ProtectedRoute allowedRoles={["admin", "logistica", "faturamento"]}><Vendedores /></ProtectedRoute>} />
          <Route path="/tipos-caminhao" element={<ProtectedRoute allowedRoles={["admin", "logistica"]}><TiposCaminhao /></ProtectedRoute>} />
          <Route path="/usuarios" element={<SuperAdminRoute><Usuarios /></SuperAdminRoute>} />
          <Route path="/clientes" element={<ProtectedRoute allowedRoles={["admin", "logistica", "faturamento"]}><Clientes /></ProtectedRoute>} />
          <Route path="/rupturas" element={<ProtectedRoute allowedRoles={["admin", "logistica", "faturamento"]}><Rupturas /></ProtectedRoute>} />
          <Route path="/consolidado" element={<ProtectedRoute allowedRoles={["admin", "logistica", "faturamento"]}><Consolidado /></ProtectedRoute>} />
          <Route path="/portaria" element={<ProtectedRoute allowedRoles={["admin", "logistica", "portaria"]}><PortariaCargaPropria /></ProtectedRoute>} />
          <Route path="/portaria/carga-propria" element={<ProtectedRoute allowedRoles={["admin", "logistica", "portaria"]}><PortariaCargaPropria /></ProtectedRoute>} />
          <Route path="/portaria/terceirizado" element={<ProtectedRoute allowedRoles={["admin", "logistica", "portaria"]}><PortariaTerceirizado /></ProtectedRoute>} />
          <Route path="/portaria/manual" element={<ProtectedRoute allowedRoles={["admin", "logistica", "portaria"]}><PortariaManual /></ProtectedRoute>} />
          <Route path="/portaria/admin" element={<SuperAdminRoute><PortariaAdmin /></SuperAdminRoute>} />
          <Route path="/expedicao" element={<ProtectedRoute allowedRoles={["admin", "logistica", "portaria", "expedicao"]}><Expedicao /></ProtectedRoute>} />
          <Route path="/portaria/registro-entrada" element={<ProtectedRoute allowedRoles={["admin", "logistica", "portaria"]}><RegistroEntrada /></ProtectedRoute>} />
          <Route path="/portaria/chegada-sem-previsao" element={<ProtectedRoute allowedRoles={["admin", "logistica", "portaria"]}><RegistroEntrada /></ProtectedRoute>} />
          <Route path="/motoristas" element={<ProtectedRoute allowedRoles={["admin", "logistica", "portaria"]}><Motoristas /></ProtectedRoute>} />
          <Route path="/motoristas-painel" element={<ProtectedRoute allowedRoles={["admin", "logistica"]}><MotoristasPainel /></ProtectedRoute>} />
          <Route path="/caminhoes" element={<ProtectedRoute allowedRoles={["admin", "logistica"]}><Caminhoes /></ProtectedRoute>} />
          <Route path="/cadastros" element={<ProtectedRoute allowedRoles={["admin", "logistica", "portaria"]}><Cadastros /></ProtectedRoute>} />
          <Route path="/analytics" element={<ProtectedRoute allowedRoles={["admin", "logistica", "faturamento"]}><Analytics /></ProtectedRoute>} />
          <Route path="/backups" element={<SuperAdminRoute><Backups /></SuperAdminRoute>} />
          <Route path="/logs" element={<SuperAdminRoute><Logs /></SuperAdminRoute>} />
          <Route path="/lixeira" element={<SuperAdminRoute><Lixeira /></SuperAdminRoute>} />
          <Route path="/relatorios" element={<ProtectedRoute allowedRoles={["admin", "logistica", "faturamento"]}><Relatorios /></ProtectedRoute>} />
          <Route path="/templates-rota" element={<ProtectedRoute allowedRoles={["admin", "logistica", "faturamento"]}><TemplatesRota /></ProtectedRoute>} />
          <Route path="/ocorrencias" element={<ProtectedRoute allowedRoles={["admin", "logistica", "portaria"]}><Ocorrencias /></ProtectedRoute>} />
          <Route path="/logistica" element={<ProtectedRoute allowedRoles={["admin", "logistica"]}><Logistica /></ProtectedRoute>} />
          <Route path="/manual-tecnico" element={<SuperAdminRoute><ManualTecnico /></SuperAdminRoute>} />
          <Route path="/meu-painel" element={<ProtectedRoute allowedRoles={["vendedor"]}><MeuPainel /></ProtectedRoute>} />
          <Route path="/meu-painel/:vendedorId" element={<ProtectedRoute allowedRoles={["admin"]}><MeuPainel /></ProtectedRoute>} />
          <Route path="/vendedores-painel" element={<ProtectedRoute allowedRoles={["admin"]}><VendedoresPainel /></ProtectedRoute>} />
          <Route path="/aprovacoes" element={<ProtectedRoute allowedRoles={["admin", "faturamento"]}><Aprovacoes /></ProtectedRoute>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </AuthProvider>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </TooltipProvider>
    <Toaster />
    <Sonner />
  </QueryClientProvider>
);

export default App;
