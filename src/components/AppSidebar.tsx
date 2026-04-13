import { Link, useLocation } from "react-router-dom";
import { forwardRef } from "react";
import { LayoutDashboard, Package, Users, Truck, UserCog, LogOut, AlertTriangle, Building2, ClipboardList, DoorOpen, Contact, BarChart3, FileBarChart, Database } from "lucide-react";
import fricoLogo from "@/assets/frico-logo.png";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const allNavItems = [
  { to: "/", label: "Painel", icon: LayoutDashboard, roles: ["admin", "logistica", "faturamento"] },
  { to: "/consolidado", label: "Consolidado", icon: ClipboardList, roles: ["admin", "logistica", "faturamento"] },
  { to: "/rupturas", label: "Rupturas", icon: AlertTriangle, roles: ["admin", "logistica", "faturamento"] },
  { to: "/analytics", label: "Analytics", icon: BarChart3, roles: ["admin", "logistica", "faturamento"] },
  
  { to: "/relatorios", label: "Relatórios", icon: FileBarChart, roles: ["admin", "logistica", "faturamento"] },
  { to: "/produtos", label: "Produtos", icon: Package, roles: ["admin", "logistica", "faturamento"] },
  { to: "/vendedores", label: "Vendedores", icon: Users, roles: ["admin", "logistica", "faturamento"] },
  { to: "/clientes", label: "Clientes", icon: Building2, roles: ["admin", "logistica", "faturamento"] },
  { to: "/portaria", label: "Portaria", icon: DoorOpen, roles: ["admin", "logistica", "portaria"] },
  { to: "/motoristas", label: "Motoristas", icon: Contact, roles: ["admin", "logistica", "portaria"] },
  { to: "/caminhoes", label: "Caminhões", icon: Truck, roles: ["admin", "logistica"] },
  { to: "/tipos-caminhao", label: "Tipos de Caminhão", icon: Truck, roles: ["admin", "logistica"] },
  { to: "/usuarios", label: "Usuários", icon: UserCog, roles: ["admin"] },
  { to: "/backups", label: "Backups", icon: Database, roles: ["admin"] },
];

interface Props {
  collapsed?: boolean;
  onNavigate?: () => void;
}

// forwardRef wrapper for Link to avoid ref warnings with TooltipTrigger
const RefLink = forwardRef<HTMLAnchorElement, React.ComponentProps<typeof Link>>((props, ref) => (
  <Link ref={ref} {...props} />
));
RefLink.displayName = "RefLink";

export function AppSidebar({ collapsed, onNavigate }: Props) {
  const location = useLocation();
  const { role, signOut, user } = useAuth();

  const navItems = allNavItems.filter((item) => role && item.roles.includes(role));

  return (
    <TooltipProvider delayDuration={0}>
      <aside className={cn(
        "h-screen bg-sidebar text-sidebar-foreground flex flex-col border-r border-sidebar-border transition-all duration-200 overflow-y-auto",
        collapsed ? "w-14" : "w-60"
      )}>
        <div className={cn("border-b border-sidebar-border transition-all duration-200", collapsed ? "p-2" : "p-5")}>
          <div className={cn("flex items-center", collapsed ? "justify-center" : "gap-2")}>
            <img src={fricoLogo} alt="Frico Alimentos" className={cn("w-auto object-contain transition-all duration-200", collapsed ? "h-7" : "h-9")} width={36} height={36} />
            {!collapsed && (
              <div>
                <h1 className="text-base font-bold text-sidebar-primary-foreground tracking-tight">Expedição</h1>
                <p className="text-[10px] text-sidebar-foreground/60 uppercase tracking-widest">Painel Logístico</p>
              </div>
            )}
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => {
            const active = location.pathname === item.to;
            const link = (
              <RefLink
                key={item.to}
                to={item.to}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-3 rounded-md text-sm font-medium transition-colors",
                  collapsed ? "justify-center px-0 py-2.5" : "px-3 py-2.5",
                  active
                    ? "bg-sidebar-accent text-sidebar-primary"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {!collapsed && item.label}
              </RefLink>
            );

            if (collapsed) {
              return (
                <Tooltip key={item.to}>
                  <TooltipTrigger asChild>{link}</TooltipTrigger>
                  <TooltipContent side="right">{item.label}</TooltipContent>
                </Tooltip>
              );
            }
            return link;
          })}
        </nav>
        {user && (
          <div className="p-3 border-t border-sidebar-border">
            {!collapsed && (
              <div className="px-3 py-1 mb-2">
                <p className="text-xs text-sidebar-foreground/60 truncate">{user.email}</p>
                <p className="text-[10px] text-sidebar-foreground/40 uppercase">{role ?? "..."}</p>
              </div>
            )}
            {collapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    className="w-full flex items-center justify-center p-2 rounded-md text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
                    onClick={signOut}
                    aria-label="Sair"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">Sair</TooltipContent>
              </Tooltip>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                onClick={signOut}
              >
                <LogOut className="h-4 w-4 mr-2" /> Sair
              </Button>
            )}
          </div>
        )}
      </aside>
    </TooltipProvider>
  );
}
