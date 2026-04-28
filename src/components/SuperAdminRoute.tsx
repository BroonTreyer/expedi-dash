import { useEffect, useRef } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  children: React.ReactNode;
}

export function SuperAdminRoute({ children }: Props) {
  const { user, role, loading } = useAuth();
  const { isSuperAdmin } = useSuperAdmin();
  const toastShown = useRef(false);

  const roleStillLoading = loading && !!user && role === null;
  const missingRole = !loading && !!user && role === null;
  const accessDenied = !loading && !!user && !!role && !isSuperAdmin;

  useEffect(() => {
    if ((accessDenied || missingRole) && !toastShown.current) {
      toastShown.current = true;
      toast.error(missingRole ? "Perfil de acesso não encontrado" : "Área restrita ao Super Admin");
    }
  }, [accessDenied, missingRole]);

  if (loading || roleStillLoading) {
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