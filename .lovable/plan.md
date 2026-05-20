## Continuação do refazer do módulo Recebimento MP

Banco novo (mp_*) e hooks já estão prontos. Falta agora a camada de UI nova, o importador e as páginas de análise por produto. Sigo nesta ordem:

### 1. Importador e dashboard antigo
- **`ImportarRecebimentosMpDialog.tsx`** — adaptar para o novo modelo (header `mp_recebimentos` + 1..N `mp_recebimento_itens`). Aceita planilha com colunas: data, fornecedor, motorista, placa, NF, produto, peso (kg/ton auto), valor/ton. Agrupa por (data + fornecedor + placa) num único recibo com vários itens. Mostra preview, divergências e total estimado antes de gravar.
- **`useRecebimentosMpDashboard.ts`** — apontar para a view `mp_compras_mensal_produto` + agregados do header (toneladas/mês, R$/mês, ticket médio, top fornecedores).

### 2. Sidebar interno + sub-rotas
- Trocar `RecebimentoMp.tsx` (hoje Tabs) por um **shell com `SidebarProvider`** + `<Outlet />`. Sidebar `collapsible="icon"` com grupos:
  - **Operação:** Operação do dia, Histórico
  - **Análise:** Compras por Produto, Evolução de Preços
  - **Fechamento:** Fechamento mensal
  - **Cadastros:** Motoristas, Fornecedores, Produtos
- Rotas em `App.tsx`:
  - `/recebimento-mp` → redireciona para `/recebimento-mp/operacao`
  - `/recebimento-mp/operacao`, `/historico`, `/compras-produto`, `/precos`, `/fechamento`, `/motoristas`, `/fornecedores`, `/produtos`
- Manter compatibilidade com `?tab=` antigo redirecionando para a sub-rota equivalente.

### 3. Páginas novas de análise
- **`ComprasProdutoPage`** (`useMpComprasProduto`)
  - Seletor de período (mês/trimestre/ano + custom) e comparativo (mês anterior, mesmo mês ano passado).
  - Tabela: Produto · Categoria · Peso (ton) · Valor (R$) · Preço médio/ton · Δ% vs comparativo · Sparkline 6m.
  - Drill-down em drawer: lista de recibos do produto no período (data, fornecedor, NF, peso, R$/ton, R$ total).
  - Botão **Exportar XLSX** (pt-BR, valores formatados, célula de total).
- **`EvolucaoPrecosPage`** (`useMpEvolucaoPreco`)
  - Recharts line chart, até 5 produtos selecionáveis, faixa min–max sombreada.
  - Tabela lateral: preço mín / médio / máx do período por produto + variação vs preço de referência (`mp_produtos.preco_referencia_ton`).
- **`FechamentoMensalPage`** (`useMpFechamentoMensal`)
  - Cards: total ton, total R$, nº de recebimentos, % pago, pendências.
  - Tabela por fornecedor (view `mp_fechamento_fornecedor`): ton, R$, status pagamento, ação "Marcar como pago" / "Gerar recibo consolidado" (PDF A4).
  - Botão **Fechar mês** → marca `mes_fechado=true` em todos os recebimentos do mês (lock já implementado por trigger).

### 4. Bibliotecas auxiliares
- **`src/lib/mp-export.ts`** — helpers de exportação XLSX (reaproveita padrão pt-BR já usado no projeto).
- Reaproveitar `lib/peso-mp.ts` para kg↔ton.

### 5. Limpeza final
- Remover `Tabs` de `RecebimentoMp.tsx` (vira shell com Sidebar + Outlet).
- Painéis existentes (`OperacaoDiaPanel`, `HistoricoDescargasPanel`, `DashboardMpPanel`, `MotoristasMpPanel`, `FornecedoresMpPanel`, `ProdutosMpPanel`) passam a ser as páginas das sub-rotas correspondentes (wrappers leves).
- Confirmar que `DashboardMpPanel` antigo é substituído pelas novas páginas de análise (mantenho como "Visão geral" opcional ou removo — recomendo **remover**, já que as 3 páginas novas cobrem tudo).

### Técnico
- Hooks novos: `useMpComprasProduto`, `useMpEvolucaoPreco`, `useMpFechamentoMensal` (usam as views já criadas na migração anterior).
- Realtime já habilitado em `mp_recebimentos` e `mp_recebimento_itens` — as páginas se atualizam sozinhas via `useEffect` em canal supabase.
- `enabled: !!session` em todas as queries para evitar fetch sem auth (regra do projeto).
- Exportações XLSX no padrão pt-BR (vírgula decimal, separador de milhar, datas dd/MM/yyyy).

### Pergunta antes de implementar
Sigo com a remoção do `DashboardMpPanel` atual (substituído pelas 3 páginas novas) ou prefere manter como "Visão geral" inicial da sidebar?
