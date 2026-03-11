import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Package, Users, Truck, UserCog, LogOut } from "lucide-react";
import fricoLogo from "@/assets/frico-logo.png";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

const allNavItems = [
  { to: "/", label: "Painel", icon: LayoutDashboard, roles: ["admin", "logistica", "faturamento"] },
  { to: "/produtos", label: "Produtos", icon: Package, roles: ["admin"] },
  { to: "/vendedores", label: "Vendedores", icon: Users, roles: ["admin"] },
  { to: "/tipos-caminhao", label: "Tipos de Caminhão", icon: Truck, roles: ["admin"] },
  { to: "/usuarios", label: "Usuários", icon: UserCog, roles: ["admin"] },
];

interface Props {
  onNavigate?: () => void;
}

export function AppSidebar({ onNavigate }: Props) {
  const location = useLocation();
  const { role, signOut, user } = useAuth();

  const navItems = allNavItems.filter((item) => !role || item.roles.includes(role));

  return (
    <aside className="w-60 min-h-screen bg-sidebar text-sidebar-foreground flex flex-col border-r border-sidebar-border">
      <div className="p-5 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <img src={fricoLogo} alt="Frico Alimentos" className="h-9 w-auto" />
          <div>
            <h1 className="text-base font-bold text-sidebar-primary-foreground tracking-tight">Expedição</h1>
            <p className="text-[10px] text-sidebar-foreground/60 uppercase tracking-widest">Painel Logístico</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const active = location.pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-primary"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      {user && (
        <div className="p-3 border-t border-sidebar-border">
          <div className="px-3 py-1 mb-2">
            <p className="text-xs text-sidebar-foreground/60 truncate">{user.email}</p>
            <p className="text-[10px] text-sidebar-foreground/40 uppercase">{role ?? "..."}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
            onClick={signOut}
          >
            <LogOut className="h-4 w-4 mr-2" /> Sair
          </Button>
        </div>
      )}
    </aside>
  );
}
