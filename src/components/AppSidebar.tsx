import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Package, Users, Truck } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/", label: "Painel", icon: LayoutDashboard },
  { to: "/produtos", label: "Produtos", icon: Package },
  { to: "/vendedores", label: "Vendedores", icon: Users },
  { to: "/tipos-caminhao", label: "Tipos de Caminhão", icon: Truck },
];

export function AppSidebar() {
  const location = useLocation();

  return (
    <aside className="w-60 min-h-screen bg-sidebar text-sidebar-foreground flex flex-col border-r border-sidebar-border">
      <div className="p-5 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <Truck className="h-7 w-7 text-sidebar-primary" />
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
    </aside>
  );
}
