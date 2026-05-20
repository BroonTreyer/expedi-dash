import { Layout } from "@/components/Layout";
import { Outlet, useSearchParams, useNavigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { PackageOpen } from "lucide-react";
import { RecebimentoMpSidebar } from "@/components/recebimento-mp/RecebimentoMpSidebar";

const LEGACY_TAB_MAP: Record<string, string> = {
  operacao: "operacao",
  historico: "historico",
  dashboard: "compras-produto",
  motoristas: "motoristas",
  fornecedores: "fornecedores",
  produtos: "produtos",
};

export default function RecebimentoMpPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // Redireciona `?tab=` legado e raiz para sub-rota
  useEffect(() => {
    if (pathname === "/recebimento-mp" || pathname === "/recebimento-mp/") {
      const tab = params.get("tab");
      const sub = (tab && LEGACY_TAB_MAP[tab]) || "operacao";
      navigate(`/recebimento-mp/${sub}`, { replace: true });
    }
  }, [pathname, params, navigate]);

  return (
    <Layout>
      <div className="flex min-h-[calc(100vh-3rem)]">
        <RecebimentoMpSidebar />
        <div className="flex-1 min-w-0">
          <header className="px-4 md:px-6 py-3 border-b bg-background/60 backdrop-blur sticky top-0 z-10">
            <div className="flex items-center gap-3">
              <div className="p-1.5 rounded-md bg-primary/10"><PackageOpen className="h-5 w-5 text-primary" /></div>
              <div>
                <h1 className="text-lg font-bold tracking-tight">Recebimento de Matéria Prima</h1>
                <p className="text-[11px] text-muted-foreground">Operação, análise por produto e fechamento mensal.</p>
              </div>
            </div>
          </header>
          <main className="p-4 md:p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </Layout>
  );
}
