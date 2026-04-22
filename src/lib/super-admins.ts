/**
 * Lista de emails com privilégio de Super Admin.
 * Super Admins têm acesso exclusivo a: Usuários, Backups, Logs, Lixeira.
 *
 * Para conceder acesso a um novo Super Admin, adicione o email aqui (em minúsculas)
 * E garanta que o usuário tenha role 'admin' em user_roles.
 */
export const SUPER_ADMIN_EMAILS = [
  "matheuscarneiro004@gmail.com",
  "matheuss-s@hotmail.com",
] as const;

export function isSuperAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return SUPER_ADMIN_EMAILS.includes(email.toLowerCase().trim() as any);
}