import { useEffect, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth, type AppRole } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  children: React.ReactNode;
  allowedRoles?: AppRole[];
}

export function ProtectedRoute({ children, allowedRoles }: Props) {
  const { user, role, loading, roleFetchFailed, refreshRole } = useAuth();
  const toastShown = useRef(false);
  const [graceElapsed, setGraceElapsed] = useState(false);

  // Grace period when user exists but role is missing (transient fetch failure)
  useEffect(() => {
    if (loading || !user || !allowedRoles) return;
    if (role !== null) return;
    setGraceElapsed(false);
    // Try a refetch and wait a bit before deciding it's truly missing
    refreshRole();
    const t = setTimeout(() => setGraceElapsed(true), 1500);
    return () => clearTimeout(t);
  }, [loading, user, role, allowedRoles, refreshRole]);

  const roleStillLoading = loading && !!user && role === null && !!allowedRoles;
  const inGracePeriod = !loading && !!user && role === null && !!allowedRoles && !graceElapsed;
  const missingRole = !loading && !!user && role === null && !!allowedRoles && graceElapsed && !roleFetchFailed;
  const fetchFailed = !loading && !!user && role === null && !!allowedRoles && graceElapsed && roleFetchFailed;
  const accessDenied = !loading && !!user && !!allowedRoles && !!role && !allowedRoles.includes(role);

  useEffect(() => {
    if (accessDenied && !toastShown.current) {
      toastShown.current = true;
      toast.error("Acesso não permitido para seu nível", { id: "auth-access-denied" });
    } else if (missingRole && !toastShown.current) {
      toastShown.current = true;
      toast.error("Perfil de acesso não encontrado", { id: "auth-missing-role" });
    } else if (fetchFailed && !toastShown.current) {
      toastShown.current = true;
      toast.error("Não foi possível verificar suas permissões. Tentando reconectar...", { id: "auth-fetch-failed" });
    }
  }, [accessDenied, missingRole, fetchFailed]);

  if (loading || roleStillLoading || inGracePeriod || fetchFailed) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  if (accessDenied || missingRole) {
    const fallback =
      role === "portaria" ? "/portaria" :
      role === "vendedor" ? "/meu-painel" :
      role === "expedicao" ? "/expedicao" :
      role ? "/" : "/auth";
    return <Navigate to={fallback} replace />;
  }

  return <>{children}</>;
}
