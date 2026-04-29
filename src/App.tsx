import { lazy, Suspense, type ComponentType } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuthState, AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SuperAdminRoute } from "@/components/SuperAdminRoute";
import { Loader2 } from "lucide-react";

// Auth is kept eager since it's the landing page (LCP)
import Auth from "./pages/Auth";

// Retry helper for dynamic imports — recovers from stale chunks after deploy/HMR
const lazyWithRetry = <T extends ComponentType<unknown>>(
  factory: () => Promise<{ default: T }>,
  retries = 2,
  delay = 400,
) =>
  lazy(async () => {
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

// Lazy-loaded routes
const Index = lazyWithRetry(() => import("./pages/Index"));
const Produtos = lazyWithRetry(() => import("./pages/Produtos"));
const Vendedores = lazyWithRetry(() => import("./pages/Vendedores"));
const TiposCaminhao = lazyWithRetry(() => import("./pages/TiposCaminhao"));
const Usuarios = lazyWithRetry(() => import("./pages/Usuarios"));
const Rupturas = lazyWithRetry(() => import("./pages/Rupturas"));
const Clientes = lazyWithRetry(() => import("./pages/Clientes"));
const Consolidado = lazyWithRetry(() => import("./pages/Consolidado"));
const PortariaCargaPropria = lazyWithRetry(() => import("./pages/PortariaCargaPropria"));
const PortariaTerceirizado = lazyWithRetry(() => import("./pages/PortariaTerceirizado"));
const PortariaManual = lazyWithRetry(() => import("./pages/PortariaManual"));
const RegistroEntrada = lazyWithRetry(() => import("./pages/RegistroEntrada"));
const Motoristas = lazyWithRetry(() => import("./pages/Motoristas"));
const MotoristasPainel = lazyWithRetry(() => import("./pages/MotoristasPainel"));
const Caminhoes = lazyWithRetry(() => import("./pages/Caminhoes"));
const Cadastros = lazyWithRetry(() => import("./pages/Cadastros"));
const Analytics = lazyWithRetry(() => import("./pages/Analytics"));
const Backups = lazyWithRetry(() => import("./pages/Backups"));
const Relatorios = lazyWithRetry(() => import("./pages/Relatorios"));
const Logs = lazyWithRetry(() => import("./pages/Logs"));
const Lixeira = lazyWithRetry(() => import("./pages/Lixeira"));
const PortalMotorista = lazyWithRetry(() => import("./pages/PortalMotorista"));
const TemplatesRota = lazyWithRetry(() => import("./pages/TemplatesRota"));
const NotFound = lazyWithRetry(() => import("./pages/NotFound"));
const MeuPainel = lazyWithRetry(() => import("./pages/MeuPainel"));
const VendedoresPainel = lazy(() => import("./pages/VendedoresPainel"));
const Aprovacoes = lazy(() => import("./pages/Aprovacoes"));

const PageFallback = () => (
  <div className="min-h-screen flex items-center justify-center">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
