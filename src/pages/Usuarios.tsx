import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import type { AppRole } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";

interface UserRow {
  id: string;
  nome: string;
  email: string;
  role: AppRole | null;
}

const ROLE_LABELS: Record<AppRole, string> = {
  admin: "Admin",
  logistica: "Logística",
  faturamento: "Faturamento",
  portaria: "Portaria",
};

function RoleSelect({ value, onChange }: { value: AppRole | null; onChange: (v: AppRole) => void }) {
  return (
    <Select value={value ?? ""} onValueChange={(v) => onChange(v as AppRole)}>
      <SelectTrigger className="h-8 text-xs">
        <SelectValue placeholder="Sem nível" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="admin">Admin</SelectItem>
        <SelectItem value="logistica">Logística</SelectItem>
        <SelectItem value="faturamento">Faturamento</SelectItem>
        <SelectItem value="portaria">Portaria</SelectItem>
      </SelectContent>
    </Select>
  );
}

function UserList({ users, onRoleChange }: { users: UserRow[]; onRoleChange: (id: string, role: AppRole) => void }) {
  const isMobile = useIsMobile();

  if (users.length === 0) {
    return <p className="text-center py-8 text-muted-foreground">Nenhum usuário encontrado</p>;
  }

  if (isMobile) {
    return (
      <div className="space-y-3">
        {users.map((u) => (
          <div key={u.id} className="rounded-lg border border-border bg-card p-4 space-y-3">
            <div>
              <p className="text-sm font-medium">{u.nome || "—"}</p>
              <p className="text-xs text-muted-foreground truncate">{u.email}</p>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Nível</span>
              <div className="w-[140px]">
                <RoleSelect value={u.role} onChange={(v) => onRoleChange(u.id, v)} />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
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
          {users.map((u) => (
            <TableRow key={u.id}>
              <TableCell className="text-sm font-medium">{u.nome || "—"}</TableCell>
              <TableCell className="text-sm">{u.email}</TableCell>
              <TableCell>
                <RoleSelect value={u.role} onChange={(v) => onRoleChange(u.id, v)} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export default function Usuarios() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", nome: "", role: "logistica" as AppRole });

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
        role: (roleMap.get(p.id) as AppRole) ?? null,
      }))
    );
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleRoleChange = async (userId: string, newRole: AppRole) => {
    // Delete existing role(s) then insert new one (no unique on user_id alone)
    await supabase.from("user_roles").delete().eq("user_id", userId);
    const { error } = await supabase
      .from("user_roles")
      .insert({ user_id: userId, role: newRole });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Nível atualizado");
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role: newRole } : u));
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.password || !form.nome) {
      toast.error("Preencha todos os campos");
      return;
    }
    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-user", {
        body: { email: form.email, password: form.password, nome: form.nome, role: form.role },
      });
      if (error) {
        toast.error(error.message || "Erro ao criar usuário");
      } else if (data?.error) {
        toast.error(data.error);
      } else {
        toast.success("Usuário criado com sucesso");
        setForm({ email: "", password: "", nome: "", role: "logistica" });
        setDialogOpen(false);
        fetchUsers();
      }
    } catch (err: any) {
      toast.error(err.message || "Erro inesperado");
    } finally {
      setCreating(false);
    }
  };

  return (
    <Layout>
      <div className="p-4 md:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Gerenciar Usuários</h1>
            <p className="text-sm text-muted-foreground">Defina os níveis de acesso dos usuários</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Novo Usuário</Button>
            </DialogTrigger>
            <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Criar Usuário</DialogTitle>
                <p className="text-sm text-muted-foreground">Preencha os dados para criar um novo usuário</p>
              </DialogHeader>
              <form onSubmit={handleCreateUser} className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Nome completo" required />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@exemplo.com" required />
                </div>
                <div className="space-y-2">
                  <Label>Senha</Label>
                  <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Mínimo 6 caracteres" required minLength={6} />
                </div>
                <div className="space-y-2">
                  <Label>Nível de Acesso</Label>
                  <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as AppRole })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="logistica">Logística</SelectItem>
                      <SelectItem value="faturamento">Faturamento</SelectItem>
                      <SelectItem value="portaria">Portaria</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full" disabled={creating}>
                  {creating ? "Criando..." : "Criar Usuário"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <p className="text-center py-8 text-muted-foreground">Carregando...</p>
        ) : (
          <UserList users={users} onRoleChange={handleRoleChange} />
        )}
      </div>
    </Layout>
  );
}
