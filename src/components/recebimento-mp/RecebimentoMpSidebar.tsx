import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  ClipboardList, History, BarChart3, LineChart, Lock, Contact, Building2, Boxes,
  PanelLeftClose, PanelLeftOpen,
} from "lucide-react";

const GROUPS = [
  {
    label: "Operação",
    items: [
      { url: "/recebimento-mp/operacao", title: "Operação do dia", icon: ClipboardList },
      { url: "/recebimento-mp/historico", title: "Histórico", icon: History },
    ],
  },
  {
    label: "Análise",
    items: [
      { url: "/recebimento-mp/compras-produto", title: "Compras por Produto", icon: BarChart3 },
      { url: "/recebimento-mp/precos", title: "Evolução de Preços", icon: LineChart },
    ],
  },
  {
    label: "Fechamento",
    items: [
      { url: "/recebimento-mp/fechamento", title: "Fechamento Mensal", icon: Lock },
    ],
  },
  {
    label: "Cadastros",
    items: [
      { url: "/recebimento-mp/motoristas", title: "Motoristas", icon: Contact },
      { url: "/recebimento-mp/fornecedores", title: "Fornecedores", icon: Building2 },
      { url: "/recebimento-mp/produtos", title: "Produtos", icon: Boxes },
    ],
  },
];

export function RecebimentoMpSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { pathname } = useLocation();
  const isActive = (p: string) => pathname === p || pathname.startsWith(p + "/");

  return (
    <aside className={cn(
      "shrink-0 border-r bg-card/30 transition-all duration-200 sticky top-0 self-start h-[calc(100vh-3rem)] overflow-y-auto",
      collapsed ? "w-14" : "w-56",
    )}>
      <div className="flex justify-end p-2 border-b">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCollapsed((c) => !c)}>
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </Button>
      </div>
      <nav className="p-2 space-y-4">
        {GROUPS.map((g) => (
          <div key={g.label}>
            {!collapsed && (
              <div className="px-2 mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {g.label}
              </div>
            )}
            <ul className="space-y-0.5">
              {g.items.map((item) => {
                const active = isActive(item.url);
                return (
                  <li key={item.url}>
                    <NavLink
                      to={item.url}
                      title={item.title}
                      className={cn(
                        "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                        active
                          ? "bg-primary text-primary-foreground font-medium"
                          : "hover:bg-muted text-foreground/80",
                        collapsed && "justify-center",
                      )}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span className="truncate">{item.title}</span>}
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}