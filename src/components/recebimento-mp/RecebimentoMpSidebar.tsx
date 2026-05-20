import { NavLink, useLocation } from "react-router-dom";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar,
} from "@/components/ui/sidebar";
import { ClipboardList, History, BarChart3, LineChart, Lock, Contact, Building2, Boxes } from "lucide-react";

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
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { pathname } = useLocation();
  const isActive = (p: string) => pathname === p || pathname.startsWith(p + "/");

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarContent>
        {GROUPS.map((g) => (
          <SidebarGroup key={g.label}>
            {!collapsed && <SidebarGroupLabel>{g.label}</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>
                {g.items.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                      <NavLink to={item.url} className="flex items-center gap-2">
                        <item.icon className="h-4 w-4 shrink-0" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}