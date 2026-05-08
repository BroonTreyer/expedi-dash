import { Layout } from "@/components/Layout";
import { TransportadorasTab } from "@/components/cadastros/TransportadorasTab";

export default function Transportadoras() {
  return (
    <Layout>
      <main className="p-4 md:p-6 space-y-4 max-w-6xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Transportadoras (Financeiro)</h1>
        </div>
        <TransportadorasTab />
      </main>
    </Layout>
  );
}
