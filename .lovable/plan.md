## Página Logística

Nova rota `/logistica` (Admin + Logística), 4 abas.

### 1) Banco — novas tabelas

```text
tabela_frete
  id, destino_cidade, destino_uf, tipo_veiculo ('bitruck'|'carreta'),
  valor_kg numeric, ativo bool, created_at
  UNIQUE(destino_cidade, destino_uf, tipo_veiculo)

ctes_dacte
  id, numero_cte text, serie text, valor_frete numeric,
  carga_id text NULL, transportadora text, placa text,
  destino_cidade text, destino_uf text, peso_total numeric,
  notas_fiscais jsonb (array de números NF),
  pdf_url text (storage), raw_extracao jsonb,
  status text ('pendente'|'vinculado'|'divergente'),
  created_by uuid, created_at
  INDEX em numero_cte, carga_id
```

RLS: SELECT/INSERT/UPDATE/DELETE para `admin` e `logistica`.

Bucket Storage `dacte` (privado), URLs assinadas 1 ano. Reaproveita padrão do bucket `portaria`.

### 2) Edge function `parse-dacte-pdf`

Espelha `parse-pedido-pdf`: valida JWT, recebe `fileBase64`, chama Lovable AI (`google/gemini-2.5-flash`) com tool calling. Extrai:
- `numero_cte`, `serie`, `valor_frete`
- `transportadora`, `placa`, `destino_cidade`, `destino_uf`, `peso_total`
- `notas_fiscais[]` (lista de NFs vinculadas)

Retorna JSON estruturado. Frontend salva em `ctes_dacte` e tenta auto-vincular: busca `carregamentos_dia` por `numero_pedido ∈ notas_fiscais` para descobrir `carga_id`. Se único → status `vinculado`; se múltiplos/zero → `pendente` (vínculo manual).

### 3) UI — `src/pages/Logistica.tsx`

Quatro tabs:

**a) Visão Geral** — KPIs do mês: total fretes (R$), nº CT-es, custo médio R$/kg, top 5 destinos por gasto. Gráfico barras Recharts.

**b) Tabela de Frete** — CRUD `tabela_frete`. Colunas: Destino, UF, Bitruck (R$/kg), Carreta (R$/kg). Linha por destino com 2 valores editáveis (espelhando a planilha do print). Botão "Importar planilha" (xlsx) reusa padrão de `ImportarPlanilhaDialog`.

**c) CT-es / DACTE** — Lista de `ctes_dacte` com filtros (data, transportadora, status). Botão **"Importar DACTE (PDF)"** abre dialog tipo `ImportarPedidoPdfDialog` (multi-arquivo). Mostra pré-visualização da extração antes de salvar. Linha clicável abre detalhes + permite vincular manualmente a uma carga.

**d) Gastos por Vendedor** — Filtro por período. Para cada CT-e vinculado:
1. soma `peso` da `carregamentos_dia` da `carga_id` agrupando por `vendedor_id`
2. rateia `valor_frete` proporcional ao peso de cada vendedor
3. agrega no período selecionado

Tabela: Vendedor · Peso total (kg) · Frete rateado (R$) · R$/kg médio. Export XLSX. Gráfico ranking horizontal.

### 4) Hooks

- `src/hooks/useTabelaFrete.ts` — list/upsert/delete
- `src/hooks/useCtesDacte.ts` — list/insert/vincular + invoke `parse-dacte-pdf`
- `src/hooks/useGastosVendedor.ts` — agrega rateio (cliente-side, queries paralelas com `enabled: !!session`)

### 5) Sidebar / Roteamento

Adicionar item "Logística" em `AppSidebar.tsx` (ícone `Truck`), visível para `admin` e `logistica`. Rota lazy em `App.tsx` com `ProtectedRoute allowedRoles={['admin','logistica']}`.

### Arquivos

**Novos:**
- `supabase/migrations/<ts>_logistica.sql` (2 tabelas, RLS, bucket)
- `supabase/functions/parse-dacte-pdf/index.ts`
- `src/pages/Logistica.tsx`
- `src/components/logistica/TabelaFreteTab.tsx`
- `src/components/logistica/CtesDacteTab.tsx`
- `src/components/logistica/ImportarDacteDialog.tsx`
- `src/components/logistica/GastosVendedorTab.tsx`
- `src/components/logistica/LogisticaKpis.tsx`
- `src/hooks/useTabelaFrete.ts`, `useCtesDacte.ts`, `useGastosVendedor.ts`

**Editados:**
- `src/App.tsx` (rota)
- `src/components/AppSidebar.tsx` (item menu)
