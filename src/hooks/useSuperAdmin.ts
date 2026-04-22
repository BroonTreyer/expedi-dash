import { useAuth } from "@/hooks/useAuth";
import { isSuperAdminEmail } from "@/lib/super-admins";

/**
 * Retorna true se o usuário logado for Super Admin:
 * - email está na lista SUPER_ADMIN_EMAILS
 * - role é 'admin'
 */
export function useSuperAdmin(): { isSuperAdmin: boolean; loading: boolean } {
  const { user, role, loading } = useAuth();
  const isSuperAdmin = !!user && role === "admin" && isSuperAdminEmail(user.email);
  return { isSuperAdmin, loading };
}