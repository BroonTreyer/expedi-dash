## Aba de Acompanhamento Detalhado de Motoristas

Criar uma nova página `/motoristas-painel` (separada do CRUD atual em `/motoristas`) que consolida tudo o que já é capturado na portaria — KM rodado, horários de saída/retorno, tempo de rota, peso transportado, entregas — em uma visão rica por motorista.

### Estrutura da página

**1. Filtros no topo**
- Período (hoje / 7 dias / 30 dias / personalizado)
- Motorista (busca + multi-select)
- Tipo (Frota Própria / Terceirizado / Todos)

**2. KPIs gerais (cards)**
- Motoristas ativos no período
- KM total rodado
- Tempo médio de rota
- Peso total transportado (ton)
- Entregas realizadas
- Rotas concluídas vs em andamento

**3. Ranking de Motoristas (tabela principal)**
Cada linha = 1 motorista no período, com colunas:
- Nome + foto (de `motoristas`)
- Nº de rotas
- KM total / KM médio por rota
- Tempo médio de rota (saída → retorno)
- Peso médio transportado
- Entregas/rota
- Última atividade
- Status atual (Em rota / Disponível)
- Sparkline de KM nos últimos dias

Ordenação por qualquer coluna. Click expande detalhes.

**4. Detalhe do Motorista (drawer ao clicar)**
- Cabeçalho com foto, CPF, telefone, caminhão habitual
- Timeline cronológica de movimentos: cada rota com Saída → Retorno, KM inicial/final, tempo total, peso, qtd entregas, carga vinculada, ocorrências
- Mini-gráfico: KM rodado por dia (últimos 30d)
- Mini-gráfico: Tempo de rota por dia
- Lista de cargas vinculadas com link para o pedido

**5. Aba "Em Rota Agora"** (sub-tab)
Lista em tempo real dos motoristas atualmente fora (etapa_carga_propria = 'em_rota' ou terceirizado equivalente), mostrando placa, carga, hora de saída, tempo decorrido, destino estimado.

### Detalhes técnicos

**Fonte de dados:** tabela `movimentacoes_portaria` (já tem `horario_real_saida`, `horario_real_retorno`, `km_inicial`, `km_final`, `km_rodado`, `peso`, `qtd_entregas`, `motorista`, `placa`, `carga_id`, `etapa_carga_propria`) + join lógico com `motoristas` (foto, CPF) por nome (fallback) ou via `caminhoes.motorista_id` quando placa bater.

**Cálculos derivados (no client, memoizados):**
- `tempo_rota = horario_real_retorno - horario_real_saida` (formato HH:mm)
- `km_rodado` quando NULL: `km_final - km_inicial`
- Agregações por motorista: `groupBy(motorista)` sobre o período filtrado

**Novos arquivos:**
- `src/pages/MotoristasPainel.tsx` — página principal com tabs (Ranking / Em Rota Agora)
- `src/components/motoristas/MotoristaKpis.tsx` — cards de KPI
- `src/components/motoristas/MotoristaRankingTable.tsx` — tabela com sparklines
- `src/components/motoristas/MotoristaDetalheDrawer.tsx` — timeline + gráficos
- `src/components/motoristas/EmRotaAgoraPanel.tsx` — lista live
- `src/hooks/useMotoristasPainel.ts` — query agregadora com filtros
- Rota adicionada em `src/App.tsx` e item no `src/components/AppSidebar.tsx` (visível para admin/logística)

**Sem mudanças no banco** — todos os dados já existem. Apenas leitura.

**Realtime:** subscrição em `movimentacoes_portaria` (debounce 1.5s, padrão do projeto) para a tab "Em Rota Agora".

**Permissões:** acessível para `admin` e `logistica` (RLS já existente cobre).

**Formato pt-BR:** distâncias em `1.234,5 km`, datas `dd/MM HH:mm`, durações `Xh Ymin` (lib `portaria-tempos.ts` já existe).

### Limites do escopo
- Não vou criar tabela de "viagens" consolidadas — agregação é feita on-the-fly. Se volume crescer (>10k movs/período), cria-se uma view materializada depois.
- Não vou alterar a captura de dados na Portaria; só consumir o que já é gravado.
- Não vou mexer em `Motoristas.tsx` (CRUD) — esta é uma página nova de leitura.
