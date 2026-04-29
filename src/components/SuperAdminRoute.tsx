import { useEffect, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  children: React.ReactNode;
}

export function SuperAdminRoute({ children }: Props) {
  const { user, role, loading, roleFetchFailed, refreshRole } = useAuth();
  const { isSuperAdmin } = useSuperAdmin();
  const toastShown = useRef(false);
  const [graceElapsed, setGraceElapsed] = useState(false);

  useEffect(() => {
    if (loading || !user || role !== null) return;
    setGraceElapsed(false);
    refreshRole();
    const t = setTimeout(() => setGraceElapsed(true), 2500);
    return () => clearTimeout(t);
  }, [loading, user, role, refreshRole]);

  const roleStillLoading = loading && !!user && role === null;
  const inGracePeriod = !loading && !!user && role === null && !graceElapsed;
  const missingRole = !loading && !!user && role === null && graceElapsed && !roleFetchFailed;
  const fetchFailed = !loading && !!user && role === null && graceElapsed && roleFetchFailed;
  const accessDenied = !loading && !!user && !!role && !isSuperAdmin;

  useEffect(() => {
    if (accessDenied && !toastShown.current) {
      toastShown.current = true;
      toast.error("Área restrita ao Super Admin", { id: "auth-superadmin-denied" });
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
      <div className="min-h-screen flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  if (accessDenied || missingRole) {
    const fallback = role === "portaria" ? "/portaria" : "/";
    return <Navigate to={fallback} replace />;
  }

  return <>{children}</>;
}