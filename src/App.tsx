import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuthState, AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Produtos from "./pages/Produtos";
import Vendedores from "./pages/Vendedores";
import TiposCaminhao from "./pages/TiposCaminhao";
import Usuarios from "./pages/Usuarios";
import Rupturas from "./pages/Rupturas";
import Clientes from "./pages/Clientes";
import Consolidado from "./pages/Consolidado";
import Portaria from "./pages/Portaria";
import Motoristas from "./pages/Motoristas";
import Caminhoes from "./pages/Caminhoes";
import Analytics from "./pages/Analytics";

import Relatorios from "./pages/Relatorios";
import PortalMotorista from "./pages/PortalMotorista";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10_000,
      gcTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error: any) => {
        // Don't retry auth errors — force re-login instead
        const msg = error?.message?.toLowerCase?.() ?? "";
        const status = error?.status ?? error?.code;
        if (status === 401 || status === 403 || msg.includes("jwt") || msg.includes("refresh_token")) {
          // Try to refresh session once
          if (failureCount === 0) {
            supabase.auth.refreshSession().catch(() => {
              supabase.auth.signOut();
            });
            return true; // retry once after refresh attempt
          }
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
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route path="/portal/:token" element={<PortalMotorista />} />
        <Route path="/" element={<ProtectedRoute allowedRoles={["admin", "logistica", "faturamento"]}><Index /></ProtectedRoute>} />
        <Route path="/produtos" element={<ProtectedRoute allowedRoles={["admin", "faturamento"]}><Produtos /></ProtectedRoute>} />
        <Route path="/vendedores" element={<ProtectedRoute allowedRoles={["admin", "faturamento"]}><Vendedores /></ProtectedRoute>} />
        <Route path="/tipos-caminhao" element={<ProtectedRoute allowedRoles={["admin", "logistica"]}><TiposCaminhao /></ProtectedRoute>} />
        <Route path="/usuarios" element={<ProtectedRoute allowedRoles={["admin"]}><Usuarios /></ProtectedRoute>} />
        <Route path="/clientes" element={<ProtectedRoute allowedRoles={["admin", "faturamento"]}><Clientes /></ProtectedRoute>} />
        <Route path="/rupturas" element={<ProtectedRoute allowedRoles={["admin", "logistica", "faturamento"]}><Rupturas /></ProtectedRoute>} />
        <Route path="/consolidado" element={<ProtectedRoute allowedRoles={["admin", "logistica", "faturamento"]}><Consolidado /></ProtectedRoute>} />
        <Route path="/portaria" element={<ProtectedRoute allowedRoles={["admin", "logistica", "portaria"]}><Portaria /></ProtectedRoute>} />
        <Route path="/motoristas" element={<ProtectedRoute allowedRoles={["admin", "logistica", "portaria"]}><Motoristas /></ProtectedRoute>} />
        <Route path="/caminhoes" element={<ProtectedRoute allowedRoles={["admin", "logistica"]}><Caminhoes /></ProtectedRoute>} />
        <Route path="/analytics" element={<ProtectedRoute allowedRoles={["admin", "logistica", "faturamento"]}><Analytics /></ProtectedRoute>} />
        
        <Route path="/relatorios" element={<ProtectedRoute allowedRoles={["admin", "logistica", "faturamento"]}><Relatorios /></ProtectedRoute>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AuthProvider>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
