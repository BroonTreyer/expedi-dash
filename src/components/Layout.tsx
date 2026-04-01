import { useState } from "react";
import { AppSidebar } from "./AppSidebar";
import { Menu, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/NotificationBell";
import { cn } from "@/lib/utils";

export function Layout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex min-h-screen">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 transform transition-all duration-200 md:translate-x-0",
        mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        <AppSidebar collapsed={collapsed} onNavigate={() => setMobileOpen(false)} />
      </div>

      <div className={cn("flex-1 flex flex-col h-screen overflow-auto transition-all duration-200", collapsed ? "md:ml-14" : "md:ml-60")}>
        {/* Mobile header */}
        <header className="flex items-center justify-between h-12 border-b border-border px-3 md:hidden">
          <div className="flex items-center">
            <Button variant="ghost" size="icon" onClick={() => setMobileOpen(true)}>
              <Menu className="h-5 w-5" />
            </Button>
            <span className="ml-2 text-sm font-semibold">Expedição</span>
          </div>
          <NotificationBell />
        </header>
        {/* Desktop toggle */}
        <header className="hidden md:flex items-center h-10 border-b border-border px-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCollapsed(c => !c)}>
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </Button>
        </header>
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
