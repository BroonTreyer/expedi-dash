import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import type { AppRole } from "@/hooks/useAuth";

interface UserRow {
  id: string;
  nome: string;
  email: string;
  role: AppRole;
}

export default function Usuarios() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    setLoading(true);
    const { data: profiles, error: pErr } = await supabase.from("profiles").select("id, nome, email");
    if (pErr) { toast.error(pErr.message); setLoading(false); return; }

    const { data: roles, error: rErr } = await supabase.from("user_roles").select("user_id, role");
    if (rErr) { toast.error(rErr.message); setLoading(false); return; }

    const roleMap = new Map(roles?.map((r: any) => [r.user_id, r.role]));
    setUsers(
      (profiles ?? []).map((p: any) => ({
        id: p.id,
        nome: p.nome,
        email: p.email,
        role: (roleMap.get(p.id) as AppRole) ?? "logistica",
      }))
    );
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleRoleChange = async (userId: string, newRole: AppRole) => {
    const { error } = await supabase
      .from("user_roles")
      .update({ role: newRole })
      .eq("user_id", userId);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Nível atualizado");
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role: newRole } : u));
    }
  };

  return (
    <Layout>
      <div className="p-4 md:p-6 space-y-5">
        <h1 className="text-2xl font-bold tracking-tight">Gerenciar Usuários</h1>
        <p className="text-sm text-muted-foreground">Defina os níveis de acesso dos usuários</p>

        {loading ? (
          <p className="text-center py-8 text-muted-foreground">Carregando...</p>
        ) : (
          <div className="rounded-lg border border-border bg-card overflow-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="w-[180px]">Nível</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">Nenhum usuário encontrado</TableCell>
                  </TableRow>
                )}
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="text-sm font-medium">{u.nome || "—"}</TableCell>
                    <TableCell className="text-sm">{u.email}</TableCell>
                    <TableCell>
                      <Select value={u.role} onValueChange={(v) => handleRoleChange(u.id, v as AppRole)}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="logistica">Logística</SelectItem>
                          <SelectItem value="faturamento">Faturamento</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </Layout>
  );
}
