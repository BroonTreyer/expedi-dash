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
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10_000,
      gcTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});

function AppRoutes() {
  const auth = useAuthState();

  return (
    <AuthProvider value={auth}>
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
        <Route path="/produtos" element={<ProtectedRoute allowedRoles={["admin", "faturamento"]}><Produtos /></ProtectedRoute>} />
        <Route path="/vendedores" element={<ProtectedRoute allowedRoles={["admin", "faturamento"]}><Vendedores /></ProtectedRoute>} />
        <Route path="/tipos-caminhao" element={<ProtectedRoute allowedRoles={["admin", "logistica"]}><TiposCaminhao /></ProtectedRoute>} />
        <Route path="/usuarios" element={<ProtectedRoute allowedRoles={["admin"]}><Usuarios /></ProtectedRoute>} />
        <Route path="/clientes" element={<ProtectedRoute allowedRoles={["admin", "faturamento"]}><Clientes /></ProtectedRoute>} />
        <Route path="/rupturas" element={<ProtectedRoute allowedRoles={["admin", "logistica", "faturamento"]}><Rupturas /></ProtectedRoute>} />
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
