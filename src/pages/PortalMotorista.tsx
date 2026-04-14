import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Truck, MapPin, User, Building2, Clock, Package, AlertTriangle, CheckCircle2 } from "lucide-react";
import fricoLogo from "@/assets/frico-logo-optimized.webp";

interface TokenData {
  id: string;
  token: string;
  carga_id: string;
  nome_carga: string | null;
  placa: string | null;
  motorista: string | null;
  transportadora: string | null;
  expires_at: string;
}

interface CargaInfo {
  nome_carga: string | null;
  placa: string | null;
  motorista: string | null;
  transportadora: string | null;
  tipo_caminhao: string | null;
  etapa: string;
  status: string;
  data: string;
  cidade: string | null;
  uf: string | null;
  peso_total: number;
  qtd_pedidos: number;
}

const ETAPA_MAP: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  vendas: { label: "Em preparação", color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300", icon: Clock },
  logistica: { label: "Pronto para carregamento", color: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300", icon: Package },
  carregando: { label: "Carregando", color: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300", icon: Truck },
  finalizado: { label: "Expedido", color: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300", icon: CheckCircle2 },
};

export default function PortalMotorista() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tokenData, setTokenData] = useState<TokenData | null>(null);
  const [carga, setCarga] = useState<CargaInfo | null>(null);

  useEffect(() => {
    if (!token) { setError("Link inválido"); setLoading(false); return; }

    async function load() {
      // Fetch token
      const { data: tk, error: tkErr } = await supabase
        .from("portal_tokens")
        .select("*")
        .eq("token", token)
        .maybeSingle();

      if (tkErr || !tk) { setError("Link não encontrado ou inválido"); setLoading(false); return; }
      if (new Date(tk.expires_at) < new Date()) { setError("Este link expirou"); setLoading(false); return; }

      setTokenData(tk as TokenData);

      // Fetch carga info
      const { data: pedidos } = await supabase
        .from("carregamentos_dia")
        .select("*")
        .eq("carga_id", tk.carga_id);

      if (!pedidos || pedidos.length === 0) {
        setCarga({
          nome_carga: tk.nome_carga,
          placa: tk.placa,
          motorista: tk.motorista,
          transportadora: tk.transportadora,
          tipo_caminhao: null,
          etapa: "vendas",
          status: "Aguardando",
          data: new Date().toISOString().split("T")[0],
          cidade: null,
          uf: null,
          peso_total: 0,
          qtd_pedidos: 0,
        });
      } else {
        const first = pedidos[0];
        const peso_total = pedidos.reduce((s, p) => s + (Number(p.peso) || 0), 0);
        const ufs = [...new Set(pedidos.map((p) => p.uf).filter(Boolean))];
        const cidades = [...new Set(pedidos.map((p) => p.cidade).filter(Boolean))];
        setCarga({
          nome_carga: first.nome_carga || tk.nome_carga,
          placa: first.placa || tk.placa,
          motorista: first.motorista || tk.motorista,
          transportadora: first.transportadora || tk.transportadora,
          tipo_caminhao: first.tipo_caminhao,
          etapa: first.etapa,
          status: first.status,
          data: first.data,
          cidade: cidades.join(", ") || null,
          uf: ufs.join(", ") || null,
          peso_total,
          qtd_pedidos: pedidos.length,
        });
      }
      setLoading(false);
    }

    load();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Carregando informações...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-background p-4">
        <AlertTriangle className="h-12 w-12 text-destructive" />
        <h1 className="text-xl font-bold">{error}</h1>
        <p className="text-sm text-muted-foreground text-center">
          Verifique se o link está correto ou solicite um novo link para a equipe de logística.
        </p>
      </div>
    );
  }

  const etapa = ETAPA_MAP[carga?.etapa || "vendas"] || ETAPA_MAP.vendas;
  const EtapaIcon = etapa.icon;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          <img src={fricoLogo} alt="Frico Alimentos" className="h-10 w-auto" />
          <div>
            <h1 className="text-lg font-bold">Portal do Motorista</h1>
            <p className="text-xs text-muted-foreground">Acompanhe sua carga em tempo real</p>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* Status principal */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className={`p-3 rounded-xl ${etapa.color}`}>
                <EtapaIcon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Status da Carga</p>
                <p className="text-lg font-bold">{etapa.label}</p>
              </div>
            </div>
            {/* Progress steps */}
            <div className="flex items-center gap-1">
              {["vendas", "logistica", "carregando", "finalizado"].map((step, i) => {
                const steps = ["vendas", "logistica", "carregando", "finalizado"];
                const currentIdx = steps.indexOf(carga?.etapa || "vendas");
                const done = i <= currentIdx;
                return (
                  <div key={step} className="flex-1 flex flex-col items-center gap-1">
                    <div className={`h-2 w-full rounded-full ${done ? "bg-primary" : "bg-muted"}`} />
                    <span className="text-[9px] text-muted-foreground">
                      {ETAPA_MAP[step]?.label.split(" ")[0]}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Detalhes */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Detalhes da Carga</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {carga?.nome_carga && (
              <InfoRow icon={Package} label="Carga" value={carga.nome_carga} />
            )}
            {carga?.placa && (
              <InfoRow icon={Truck} label="Placa" value={carga.placa} />
            )}
            {carga?.motorista && (
              <InfoRow icon={User} label="Motorista" value={carga.motorista} />
            )}
            {carga?.transportadora && (
              <InfoRow icon={Building2} label="Transportadora" value={carga.transportadora} />
            )}
            {(carga?.cidade || carga?.uf) && (
              <InfoRow icon={MapPin} label="Destino" value={[carga.cidade, carga.uf].filter(Boolean).join(" - ")} />
            )}
            {carga?.tipo_caminhao && (
              <InfoRow icon={Truck} label="Tipo" value={carga.tipo_caminhao} />
            )}
            <div className="flex gap-4 pt-2 border-t border-border">
              <div className="text-center flex-1">
                <p className="text-lg font-bold">{carga?.qtd_pedidos || 0}</p>
                <p className="text-[10px] text-muted-foreground">Pedidos</p>
              </div>
              <div className="text-center flex-1">
                <p className="text-lg font-bold">{((carga?.peso_total || 0) / 1000).toFixed(1)}</p>
                <p className="text-[10px] text-muted-foreground">Toneladas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-[10px] text-muted-foreground">
          Última atualização: {new Date().toLocaleString("pt-BR")}
        </p>
      </main>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
      <div>
        <p className="text-[10px] text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}
