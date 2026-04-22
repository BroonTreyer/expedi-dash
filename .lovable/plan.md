

## Corrigir Rupturas + filtro "Hoje" no Analytics

### Bugs encontrados

1. **Aba Rupturas do Analytics está incompleta**: mostra KPIs e taxa diária, mas não diz **qual produto** nem **qual cliente** deixou de ser carregado. O gráfico "Produtos com Mais Rupturas" exibe contagem (`rupturas`) e tooltip mostra `peso` planejado em vez do **peso não carregado** (que é o que importa).
2. **Sem visão de clientes afetados**: não há lista de clientes que sofreram ruptura no período — informação central do pedido do usuário.
3. **Hook `useAnalytics` não busca `cliente`/`codigo_cliente`/`carga_id`**: sem esses campos, é impossível montar a quebra por cliente/carga, mesmo que a UI peça.
4. **Filtro "Hoje" pode aparentar "vazio"**: hoje (22/04) tem 133 linhas (65 Carregado, 46 Pendente/Problema, 14 Prontos, 8 Aguardando) — está OK, mas o problema é que **Pendente/Problema** entra no `filteredValid = false` e isso reduz `dailyWeight`. A aba Rupturas hoje renderiza, mas em datas com SOMENTE rupturas (sem nenhum status válido) ela cai em `EmptyState` — bug real. Vou desacoplar a aba Rupturas dessa checagem.

### O que muda

#### 1. `useAnalytics.ts` — buscar cliente e ampliar dados de ruptura

Adicionar ao SELECT: `cliente, codigo_cliente, carga_id, nome_carga, quantidade, quantidade_original`.

Construir três novas estruturas no `useMemo`:

- **`clienteRupturas`** — top 15 clientes por `pesoNaoCarregado` no período. Inclui código, nome, qtd de ocorrências, peso perdido e produtos afetados.
- **`produtoRupturasDetalhado`** — substitui o atual: ordena por `pesoNaoCarregado` desc, inclui `pesoNaoCarregado` (numérico) como métrica principal, mantém `count`. O gráfico passa a plotar peso perdido, não contagem.
- **`cargasComPendencia`** — top cargas afetadas (igual ao já existente em Rupturas.tsx, mas dentro do hook para reuso).

#### 2. `Analytics.tsx` — aba Rupturas reformulada

Manter os 6 KPIs atuais. Adicionar abaixo:

- **Gráfico "Top Produtos por Peso Não Carregado"** (substitui o atual): barras horizontais usando `pesoNaoCarregado`, tooltip mostrando `peso perdido (kg)` + `nº ocorrências` + `motivo principal`.
- **Card "Clientes Afetados"**: tabela compacta — Cliente | Ocorrências | Peso Não Carregado | Produtos. Top 10, com botão CSV.
- **Card "Cargas com Pendência"** (se houver `carga_id`): mostra carga, qtde rupturas, kg perdidos, status. Linka para `/rupturas?carga=...`.
- **Card "Motivos"**: barras horizontais com `motivoBreakdown` (já existe no hook), mostrando peso por motivo (Estoque, Qualidade, Logística, Outro, Não informado).

Tirar a checagem `if (!hasData) <EmptyState />` da aba Rupturas — usar checagem própria: `(rupturaKpis.totalRupturasTotais + rupturaKpis.totalRupturasParciais) === 0`. Assim o filtro "Hoje" sempre mostra rupturas mesmo se nenhuma linha tiver status válido.

#### 3. `Analytics.tsx` — botão rápido "Hoje/Ontem" reforçado

O `PERIOD_OPTIONS` já tem "Hoje" e "Ontem". Garantir que o `getDateRange("hoje")` use `format(today,'yyyy-MM-dd')` para from e to (já está correto). Adicionar ao lado do select dois botões pílula "Hoje" e "Ontem" para um clique direto, em destaque.

### Arquivos afetados

- `src/hooks/useAnalytics.ts` — novos campos no SELECT, novas estruturas `clienteRupturas`, `cargasComPendencia` e ajuste em `produtoRupturas` para retornar `pesoNaoCarregado`.
- `src/pages/Analytics.tsx` — aba "Rupturas" ganha 3 cards novos (Clientes Afetados, Cargas com Pendência, Motivos), gráfico de produtos passa a usar peso perdido, checagem de empty isolada, atalho rápido Hoje/Ontem.

### O que NÃO muda

- Banco: nada. Tudo usa colunas já existentes (`peso_original`, `motivo_ruptura`, `cliente`, `codigo_cliente`, `carga_id`).
- Página Rupturas (`/rupturas`): já mostra clientes na tabela completa (último bloco). Sem alteração.
- Hooks de carregamentos, RLS, auth.
- Outras abas do Analytics.

### Resultado

- Filtro **Hoje** no Analytics → aba Rupturas mostra: 14 totais + 2 parciais (4.641 kg perdidos hoje) com lista de produtos, clientes e cargas afetados.
- Possível responder em segundos: "qual produto faltou hoje, para qual cliente, em qual carga, por qual motivo".

