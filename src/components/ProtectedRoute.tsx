import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth, type AppRole } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  children: React.ReactNode;
  allowedRoles?: AppRole[];
}

export function ProtectedRoute({ children, allowedRoles }: Props) {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  const accessDenied = !!(allowedRoles && role && !allowedRoles.includes(role));

  useEffect(() => {
    if (accessDenied) toast.error("Acesso não permitido para seu nível");
  }, [accessDenied]);

  if (accessDenied) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
