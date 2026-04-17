import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuthState, AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PwaUpdatePrompt } from "@/components/PwaUpdatePrompt";
import { Loader2 } from "lucide-react";

// Auth is kept eager since it's the landing page (LCP)
import Auth from "./pages/Auth";

// Lazy-loaded routes
const Index = lazy(() => import("./pages/Index"));
const Produtos = lazy(() => import("./pages/Produtos"));
const Vendedores = lazy(() => import("./pages/Vendedores"));
const TiposCaminhao = lazy(() => import("./pages/TiposCaminhao"));
const Usuarios = lazy(() => import("./pages/Usuarios"));
const Rupturas = lazy(() => import("./pages/Rupturas"));
const Clientes = lazy(() => import("./pages/Clientes"));
const Consolidado = lazy(() => import("./pages/Consolidado"));
const PortariaCargaPropria = lazy(() => import("./pages/PortariaCargaPropria"));
const PortariaTerceirizado = lazy(() => import("./pages/PortariaTerceirizado"));
const RegistroEntrada = lazy(() => import("./pages/RegistroEntrada"));
const Motoristas = lazy(() => import("./pages/Motoristas"));
const Caminhoes = lazy(() => import("./pages/Caminhoes"));
const Cadastros = lazy(() => import("./pages/Cadastros"));
const Analytics = lazy(() => import("./pages/Analytics"));
const Backups = lazy(() => import("./pages/Backups"));
const Relatorios = lazy(() => import("./pages/Relatorios"));
const PortalMotorista = lazy(() => import("./pages/PortalMotorista"));
const NotFound = lazy(() => import("./pages/NotFound"));

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
      retry: (failureCount, error: any) => {
        const msg = error?.message?.toLowerCase?.() ?? "";
        const status = error?.status ?? error?.code;
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
          <Route path="/usuarios" element={<ProtectedRoute allowedRoles={["admin"]}><Usuarios /></ProtectedRoute>} />
          <Route path="/clientes" element={<ProtectedRoute allowedRoles={["admin", "logistica", "faturamento"]}><Clientes /></ProtectedRoute>} />
          <Route path="/rupturas" element={<ProtectedRoute allowedRoles={["admin", "logistica", "faturamento"]}><Rupturas /></ProtectedRoute>} />
          <Route path="/consolidado" element={<ProtectedRoute allowedRoles={["admin", "logistica", "faturamento"]}><Consolidado /></ProtectedRoute>} />
          <Route path="/portaria" element={<ProtectedRoute allowedRoles={["admin", "logistica", "portaria"]}><PortariaCargaPropria /></ProtectedRoute>} />
          <Route path="/portaria/carga-propria" element={<ProtectedRoute allowedRoles={["admin", "logistica", "portaria"]}><PortariaCargaPropria /></ProtectedRoute>} />
          <Route path="/portaria/terceirizado" element={<ProtectedRoute allowedRoles={["admin", "logistica", "portaria"]}><PortariaTerceirizado /></ProtectedRoute>} />
          <Route path="/portaria/registro-entrada" element={<ProtectedRoute allowedRoles={["admin", "logistica", "portaria"]}><RegistroEntrada /></ProtectedRoute>} />
          <Route path="/portaria/chegada-sem-previsao" element={<ProtectedRoute allowedRoles={["admin", "logistica", "portaria"]}><RegistroEntrada /></ProtectedRoute>} />
          <Route path="/motoristas" element={<ProtectedRoute allowedRoles={["admin", "logistica", "portaria"]}><Motoristas /></ProtectedRoute>} />
          <Route path="/caminhoes" element={<ProtectedRoute allowedRoles={["admin", "logistica"]}><Caminhoes /></ProtectedRoute>} />
          <Route path="/cadastros" element={<ProtectedRoute allowedRoles={["admin", "logistica", "portaria"]}><Cadastros /></ProtectedRoute>} />
          <Route path="/analytics" element={<ProtectedRoute allowedRoles={["admin", "logistica", "faturamento"]}><Analytics /></ProtectedRoute>} />
          <Route path="/backups" element={<ProtectedRoute allowedRoles={["admin"]}><Backups /></ProtectedRoute>} />
          <Route path="/relatorios" element={<ProtectedRoute allowedRoles={["admin", "logistica", "faturamento"]}><Relatorios /></ProtectedRoute>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </AuthProvider>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <PwaUpdatePrompt />
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
