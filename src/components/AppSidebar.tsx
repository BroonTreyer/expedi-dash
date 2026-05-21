import { Link, useLocation } from "react-router-dom";
import { prefetchRoute } from "@/App";
import { forwardRef, useState, useEffect, type ReactNode } from "react";
import { LayoutDashboard, Package, Users, Truck, UserCog, LogOut, AlertTriangle, Building2, ClipboardList, DoorOpen, Contact, BarChart3, FileBarChart, Database, ChevronDown, FolderCog, Search, LogIn, BookOpen, History, Trash2, ShieldCheck, User, Inbox, AlertOctagon, Monitor, PackageOpen, PackagePlus } from "lucide-react";
import fricoLogo from "@/assets/frico-logo-optimized.webp";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { RegistroEntradaBadge } from "@/components/portaria/RegistroEntradaBadge";

type Role = "admin" | "logistica" | "faturamento" | "portaria" | "vendedor" | "expedicao";

interface NavLeaf {
  to: string;
  label: string;
  icon: any;
  roles: Role[];
  badge?: (props: { collapsed: boolean }) => ReactNode;
}

interface NavGroup {
  label: string;
  icon: any;
  roles: Role[];
  children: (NavLeaf | NavGroup)[];
}

type NavNode = NavLeaf | NavGroup;

const isGroup = (n: NavNode): n is NavGroup => (n as NavGroup).children !== undefined;

const navTree: NavNode[] = [
  { to: "/meu-painel", label: "Meu Painel", icon: User, roles: ["vendedor"] },
  // 1. Visão geral
  { to: "/", label: "Painel", icon: LayoutDashboard, roles: ["admin", "logistica", "faturamento"] },
  // 2. Expedição (operação de saída)
  {
    label: "Expedição",
    icon: Monitor,
    roles: ["admin", "logistica", "faturamento", "portaria", "expedicao"],
    children: [
      { to: "/expedicao", label: "Painel Expedição", icon: Monitor, roles: ["admin", "logistica", "portaria", "expedicao"] },
      { to: "/pre-cargas", label: "Pré-cargas", icon: PackageOpen, roles: ["admin", "logistica", "faturamento"] },
      { to: "/consolidado", label: "Consolidado", icon: ClipboardList, roles: ["admin", "logistica", "faturamento"] },
      { to: "/rupturas", label: "Rupturas", icon: AlertTriangle, roles: ["admin", "logistica", "faturamento"] },
      { to: "/motoristas-painel", label: "Painel do Motorista", icon: Contact, roles: ["admin", "logistica"] },
    ],
  },
  // 3. Portaria (controle de fluxo)
  {
    label: "Portaria",
    icon: DoorOpen,
    roles: ["admin", "logistica", "portaria"],
    children: [
      { to: "/portaria/carga-propria", label: "Varejo", icon: DoorOpen, roles: ["admin", "logistica", "portaria"] },
      { to: "/portaria/terceirizado", label: "Distribuidores", icon: DoorOpen, roles: ["admin", "logistica", "portaria"] },
      { to: "/portaria/registro-entrada", label: "Registro de Entrada", icon: LogIn, roles: ["admin", "logistica", "portaria"], badge: ({ collapsed }) => <RegistroEntradaBadge collapsed={collapsed} /> },
      { to: "/cadastros", label: "Cadastros", icon: FolderCog, roles: ["admin", "logistica", "portaria"] },
      { to: "/cadastros?focus=buscar", label: "Buscar/Consultar", icon: Search, roles: ["admin", "logistica", "portaria"] },
      { to: "/motoristas", label: "Motoristas", icon: Contact, roles: ["admin", "logistica", "portaria"] },
      { to: "/caminhoes", label: "Caminhões", icon: Truck, roles: ["admin", "logistica"] },
      { to: "/tipos-caminhao", label: "Tipos de Caminhão", icon: Truck, roles: ["admin", "logistica"] },
      { to: "/portaria/manual", label: "Manual", icon: BookOpen, roles: ["admin", "logistica", "portaria"] },
    ],
  },
  // 4. Operação diária
  { to: "/aprovacoes", label: "Aprovações", icon: Inbox, roles: ["admin", "faturamento"] },
  { to: "/recebimento-mp", label: "Recebimento MP", icon: PackagePlus, roles: ["admin", "logistica", "portaria"] },
  { to: "/logistica", label: "Logística", icon: Truck, roles: ["admin", "logistica"] },
  { to: "/ocorrencias", label: "Ocorrências", icon: AlertOctagon, roles: ["admin", "logistica", "portaria"] },
  // 5. Análise
  { to: "/analytics", label: "Analytics", icon: BarChart3, roles: ["admin", "logistica", "faturamento"] },
  { to: "/relatorios", label: "Relatórios", icon: FileBarChart, roles: ["admin", "logistica", "faturamento"] },
  // 6. Cadastros base
  { to: "/clientes", label: "Clientes", icon: Building2, roles: ["admin", "logistica", "faturamento"] },
  { to: "/produtos", label: "Produtos", icon: Package, roles: ["admin", "logistica", "faturamento"] },
  { to: "/vendedores", label: "Vendedores", icon: Users, roles: ["admin", "logistica", "faturamento"] },
  { to: "/vendedores-painel", label: "Painel do Vendedor", icon: User, roles: ["admin"] },
];

const superAdminTree: NavNode[] = [
  {
    label: "Super Admin",
    icon: ShieldCheck,
    roles: ["admin"],
    children: [
      { to: "/usuarios", label: "Usuários", icon: UserCog, roles: ["admin"] },
      { to: "/logs", label: "Logs", icon: History, roles: ["admin"] },
      { to: "/lixeira", label: "Lixeira", icon: Trash2, roles: ["admin"] },
      { to: "/backups", label: "Backups", icon: Database, roles: ["admin"] },
      { to: "/portaria/admin", label: "Limpeza Portaria", icon: ShieldCheck, roles: ["admin"] },
      { to: "/manual-tecnico", label: "Manual Técnico", icon: BookOpen, roles: ["admin"] },
    ],
  },
];

interface Props {
  collapsed?: boolean;
  onNavigate?: () => void;
}

const RefLink = forwardRef<HTMLAnchorElement, React.ComponentProps<typeof Link>>((props, ref) => (
  <Link ref={ref} {...props} />
));
RefLink.displayName = "RefLink";

// Filter tree by role
function filterTree(nodes: NavNode[], role: Role | null): NavNode[] {
  if (!role) return [];
  const out: NavNode[] = [];
  for (const n of nodes) {
    if (!n.roles.includes(role)) continue;
    if (isGroup(n)) {
      const kids = filterTree(n.children, role);
      if (kids.length) out.push({ ...n, children: kids });
    } else {
      out.push(n);
    }
  }
  return out;
}

// Check if any leaf descendant matches the current path
function containsPath(node: NavNode, path: string): boolean {
  if (isGroup(node)) return node.children.some((c) => containsPath(c, path));
  return node.to === path;
}

interface NodeProps {
  node: NavNode;
  collapsed: boolean;
  depth: number;
  pathname: string;
  search: string;
  onNavigate?: () => void;
}

function NavNodeRenderer({ node, collapsed, depth, pathname, search, onNavigate }: NodeProps) {
  const padLeft = collapsed ? "" : depth === 0 ? "px-3" : depth === 1 ? "pl-9 pr-3" : "pl-12 pr-3";
  const groupHasActive = isGroup(node) && containsPath(node, pathname);
  const [open, setOpen] = useState(groupHasActive);

  useEffect(() => {
    if (groupHasActive) setOpen(true);
  }, [groupHasActive]);

  if (!isGroup(node)) {
    const [pathPart, searchPart] = node.to.split("?");
    const active = searchPart
      ? pathname === pathPart && search === `?${searchPart}`
      : pathname === pathPart && !search.includes("focus=");
    const link = (
      <RefLink
        to={{ pathname: pathPart, search: searchPart ? `?${searchPart}` : "" }}
        onClick={onNavigate}
        onMouseEnter={() => prefetchRoute(pathPart)}
        onTouchStart={() => prefetchRoute(pathPart)}
        className={cn(
          "relative flex items-center gap-3 rounded-md text-sm font-medium transition-colors",
          collapsed ? "justify-center px-0 py-2.5" : `${padLeft} py-2.5`,
          active
            ? "bg-sidebar-accent text-sidebar-primary"
            : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        )}
      >
        <node.icon className="h-4 w-4 shrink-0" />
        {!collapsed && <span className="flex-1">{node.label}</span>}
        {node.badge && node.badge({ collapsed })}
      </RefLink>
    );
    if (collapsed) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>{link}</TooltipTrigger>
          <TooltipContent side="right">{node.label}</TooltipContent>
        </Tooltip>
      );
    }
    return link;
  }

  // Group rendering
  const hasActive = groupHasActive;

  if (collapsed) {
    // In collapsed mode, render children as flat icons w/ tooltip
    return (
      <>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center justify-center px-0 py-2.5 text-sidebar-foreground/50">
              <node.icon className="h-4 w-4 shrink-0" />
            </div>
          </TooltipTrigger>
          <TooltipContent side="right">{node.label}</TooltipContent>
        </Tooltip>
        {node.children.map((child, i) => (
          <NavNodeRenderer
            key={isGroup(child) ? `${child.label}-${i}` : child.to}
            node={child}
            collapsed={collapsed}
            depth={depth + 1}
            pathname={pathname}
            search={search}
            onNavigate={onNavigate}
          />
        ))}
      </>
    );
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger
        className={cn(
          "flex w-full items-center gap-3 rounded-md text-sm font-medium transition-colors",
          padLeft,
          "py-2.5",
          hasActive
            ? "text-sidebar-primary"
            : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        )}
      >
        <node.icon className="h-4 w-4 shrink-0" />
        <span className="flex-1 text-left">{node.label}</span>
        <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-1 mt-1">
        {node.children.map((child, i) => (
          <NavNodeRenderer
            key={isGroup(child) ? `${child.label}-${i}` : child.to}
            node={child}
            collapsed={collapsed}
            depth={depth + 1}
            pathname={pathname}
            search={search}
            onNavigate={onNavigate}
          />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}

export function AppSidebar({ collapsed, onNavigate }: Props) {
  const location = useLocation();
  const { role, signOut, user } = useAuth();
  const { isSuperAdmin } = useSuperAdmin();

  const baseTree = filterTree(navTree, (role as Role) ?? null);
  const superTree = isSuperAdmin ? filterTree(superAdminTree, (role as Role) ?? null) : [];
  const tree = [...baseTree, ...superTree];

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
          {tree.map((node, i) => (
            <NavNodeRenderer
              key={isGroup(node) ? `${node.label}-${i}` : node.to}
              node={node}
              collapsed={!!collapsed}
              depth={0}
              pathname={location.pathname}
              search={location.search}
              onNavigate={onNavigate}
            />
          ))}
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
