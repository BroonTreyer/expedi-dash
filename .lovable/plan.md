
# Plano: Responsividade Total Mobile + Tablet

Objetivo: garantir que **todas** as páginas, painéis, diálogos, tabelas, formulários e menus do sistema funcionem perfeitamente em mobile (320–767px) e tablet (768–1023px), sem quebra de layout, sem texto cortado, sem scroll horizontal indesejado, sem botões inalcançáveis.

Breakpoints alvo: `sm 640`, `md 768`, `lg 1024`. Foco principal: `< md` (mobile) e `md → lg` (tablet).

---

## Princípios de aceitação (aplicados em cada tela)

- Sem overflow horizontal no `<body>` em 320px, 375px, 390px, 414px, 768px, 820px, 1024px.
- Tap targets ≥ 44×44px (botões, ícones, links de tabela).
- Texto legível: mínimo 13px em corpo, 11px só em metadados.
- Tabelas densas → cards empilhados no mobile (`md:hidden` / `hidden md:table`).
- Filtros e toolbars → colapsam em `Sheet` ou stack vertical.
- Diálogos (`Dialog`) → `max-h-[90dvh] overflow-y-auto`, largura `w-[95vw] sm:max-w-*`.
- Sidebar → drawer mobile (já existe), validar overlay e foco.
- Sem `h-screen` em containers roláveis: usar `h-dvh`.
- Sem `whitespace-nowrap` em colunas longas no mobile; usar truncate com tooltip.
- Inputs nunca menores que `h-10` no mobile (evita zoom iOS) e `text-base` (16px) em inputs.

---

## FASE 1 — Núcleo, navegação e fundações (Etapas 1–2)

**Etapa 1 — Layout global, Sidebar, Header, Auth, Index, NotFound**
- `src/components/Layout.tsx`, `AppSidebar.tsx`, `NotificationBell.tsx`, `ErrorBoundary.tsx`
- `src/pages/Auth.tsx`, `Index.tsx`, `NotFound.tsx`, `MeuPainel.tsx`
- Sidebar mobile: verificar gesto de fechar, z-index, scroll interno, agrupadores colapsáveis acessíveis com polegar.
- Header mobile: NotificationBell, espaço para título dinâmico.
- Auth: formulário centralizado, sem corte de teclado iOS (`min-h-dvh`), inputs `text-base`.

**Etapa 2 — Design tokens responsivos + utilitários globais**
- Revisar `src/index.css` e `tailwind.config.ts`: adicionar utilitários `safe-area`, `text-balance`, classes `.scroll-x-mobile` padronizadas.
- Substituir `h-screen` por `h-dvh` em todos os containers.
- Padronizar `Dialog`/`Sheet`/`Drawer` com classes responsivas reaproveitáveis.
- Criar wrapper `<ResponsiveTable>` (tabela desktop + cards mobile) reutilizável.

---

## FASE 2 — Operação diária: Dashboard, Expedição, Portaria (Etapas 3–4)

**Etapa 3 — Dashboard / Consolidado / Pré-cargas / Expedição**
- `src/pages/Consolidado.tsx`, `Expedicao.tsx`, `PreCargas.tsx`
- `src/components/dashboard/*` (KpiCards, Filters, CarregamentoTable, KanbanView, FechamentoLoteDialog, RoteirizacaoDialog, RotaMap, PreCargasPanel, CargaPrintDialog, EditarCargaDialog, AdicionarCargaDialog, MultiSelectFilter, SmartSearchBar, FreteTabelaCard)
- `src/components/expedicao/*` (ExpedicaoKpiCards, PainelAChegar, PainelNoPatio, PainelChegou, PainelCargasFechadas)
- KPIs em grid 2 col mobile / 4 col desktop.
- Filtros em `Sheet` lateral no mobile.
- Tabelas → cards no mobile com hierarquia (cliente em destaque, pedido + peso secundários, ações em `DropdownMenu`).
- Mapa de rota: altura `60dvh` no mobile, controles maiores.
- Diálogos de fechamento/edição: stepper vertical no mobile.

**Etapa 4 — Portaria (Gatehouse) + Recebimento MP**
- `src/pages/Portaria.tsx`, `PortariaAdmin.tsx`, `PortariaManual.tsx`, `PortariaCargaPropria.tsx`, `PortariaTerceirizado.tsx`, `RegistroEntrada.tsx`
- `src/components/portaria/*` (todos os 30+ componentes: PatioAtualTab, HistoricoTab, VeiculosEsperadosPanel, CargasFechadasAguardandoPanel, SolicitacoesPendentesPanel, RegistroMovimentoDialog, RegistroEntradaDialog, CapturaFoto, PhotoViewerDialog, OcrResultado, EditMovimentoDialog, MovimentoDetailsDialog, VincularCargaDialog, EditarKmDialog, EditarVeiculoEsperadoDialog, ImportarPlanilhaDialog, CancelarCargaDialog, ComprovantePortariaDialog, PortariaAdminPanel, PortariaKpiCards, autocompletes e badges)
- `src/pages/RecebimentoMp.tsx` + `src/components/recebimento-mp/*` + páginas `src/pages/recebimento-mp/*`
- Formulários dinâmicos de portaria: stack vertical, captura de foto fullscreen no mobile.
- Tabs com scroll horizontal suave; KPI cards 2×2 mobile.
- Captura de foto: garantir botões grandes, preview ocupando viewport.

---

## FASE 3 — Cadastros, Logística, Financeiro (Etapas 5–7)

**Etapa 5 — Cadastros (Clientes, Produtos, Caminhões, Motoristas, Vendedores, Transportadoras, Distribuidores, Usuários, Tipos de Caminhão, Templates de Rota, Cadastros)**
- `src/pages/Clientes.tsx`, `Produtos.tsx`, `Caminhoes.tsx`, `Motoristas.tsx`, `Vendedores.tsx`, `Transportadoras.tsx`, `Distribuidores.tsx`, `Usuarios.tsx`, `TiposCaminhao.tsx`, `TemplatesRota.tsx`, `Cadastros.tsx`
- `src/components/cadastros/TransportadorasTab.tsx`, `clientes/ImportarClientesPdfDialog.tsx`
- Listas grandes (32k+ clientes): paginação + busca sticky no topo mobile; cards com código + nome + cidade.
- Drawers de edição com `max-h-[90dvh]` e footer fixo de ações.

**Etapa 6 — Logística e Motoristas (financeiro operacional)**
- `src/pages/Logistica.tsx`, `MotoristasPainel.tsx`, `VendedoresPainel.tsx`
- `src/components/logistica/*` (AdiantamentosTab, ComprovanteAdiantamentoDialog, CtesDacteTab, GastosVendedorTab, ImportarDacteDialog, RegistrarQuitacaoDialog, TabelaFreteTab)
- `src/components/motoristas/*` (EmRotaAgoraPanel, MotoristaDetalheDrawer, MotoristaKpis, MotoristaPrintDialog, MotoristaRankingTable, MotoristaSparkline)
- `src/components/vendedor/*` (KpiVendedor, RupturasVendedor, CargasAndamentoVendedor, GraficosVendedor, MeusPedidos, NovoClienteInline, NovoPedidoDialog)
- Tabs financeiras → scroll horizontal de tabs no mobile.
- Tabelas DACTE / Adiantamentos → cards.
- Gráficos: usar `ResponsiveContainer` e altura adaptativa (`h-64 md:h-80`).

**Etapa 7 — Aprovações, Rupturas, Ocorrências, Relatórios, Analytics, Lixeira, Backups, Logs**
- `src/pages/Aprovacoes.tsx`, `Rupturas.tsx`, `Ocorrencias.tsx`, `Relatorios.tsx`, `Analytics.tsx`, `Lixeira.tsx`, `Backups.tsx`, `Logs.tsx`
- `src/components/aprovacoes/EditarPedidoAprovacaoDialog.tsx`
- `src/components/dashboard/RupturasPrintDialog.tsx`, `ConsolidadoPrintDialog.tsx`
- Filtros de período → `Popover` com calendário responsivo (1 mês no mobile).
- Cards de KPI de analytics: 1 col mobile, 2 col tablet.
- Listas de eventos/timeline: padding reduzido.

---

## FASE 4 — Portais externos, Manual, Legal (Etapa 8)

**Etapa 8 — PortalMotorista, ManualTecnico, Legal, PoliticaPrivacidade, TermosServico, ExclusaoDados**
- `src/pages/PortalMotorista.tsx`, `ManualTecnico.tsx`, `legal/LegalLayout.tsx`, `PoliticaPrivacidade.tsx`, `TermosServico.tsx`, `ExclusaoDados.tsx`
- `src/components/manual/MdxBlocks.tsx`, `src/components/portaria/ManualTab.tsx`
- `src/components/timeline/TimelineDrawer.tsx`
- Portal do motorista (público): hero adaptado, timeline vertical, sem sidebar.
- Manual técnico: sumário colapsável em mobile (`Accordion`), tipografia editorial responsiva (max 65ch).
- Páginas legais: layout single-column, navegação superior.

---

## FASE 5 — Polimento, QA cruzado e validação (Etapas 9–10)

**Etapa 9 — Componentes shadcn customizados + microinterações**
- Revisar `src/components/ui/*` que recebem uso crítico: `dialog`, `sheet`, `popover`, `command`, `calendar`, `table`, `tabs`, `select`, `pagination`, `sortable-table-head`.
- Garantir `Dialog` mobile-first: `w-[95vw] max-w-lg sm:max-w-2xl`, `max-h-[90dvh]`, footer sticky.
- `Calendar`: 1 mês mobile / 2 meses desktop.
- `Tabs`: container com scroll horizontal e sombra de borda no mobile.
- `Pagination`: simplificada (Anterior/Próximo + indicador) no mobile.
- Badges, tooltips e estados de status com tamanhos consistentes.

**Etapa 10 — QA visual completo + correções residuais**
- Rodar checklist em cada rota nos viewports 320, 375, 390, 414, 768, 820, 1024 (browser tools).
- Capturar screenshots e abrir issues residuais; corrigir o que sobrar (spacing, overflow, contraste).
- Validar impressão (carga, consolidado, rupturas, motorista, recibo MP) — não regredir layout A4.
- Atualizar memória de projeto com novas convenções (`mem://style/responsiveness-standard`).

---

## Entrega e cadência

- Cada etapa é entregue como bloco completo (commit lógico), com QA visual nos breakpoints antes de marcar como concluída.
- Mudanças são **apenas de apresentação** (Tailwind, estrutura JSX, wrappers): nenhuma regra de negócio, query, RLS, edge function ou schema será alterada.
- Itens já cobertos pela memória atual (cards mobile, formulários empilhados, listas naturalmente expansivas, navegação sticky, scroll proxy de tabelas) são reaplicados de forma consistente em toda a base.
- Riscos: regressões em telas pouco usadas (Logs, Backups, ExclusaoDados) — mitigadas pelo QA explícito da Etapa 10.

## Detalhes técnicos (referência rápida)

```text
Mobile rules of thumb
- container: px-3 sm:px-4 lg:px-6
- grid kpi: grid-cols-2 md:grid-cols-4
- toolbar: flex-col gap-2 md:flex-row md:items-center
- table-md+: hidden md:table  /  cards: md:hidden grid gap-2
- dialog: w-[95vw] max-w-lg sm:max-w-2xl max-h-[90dvh] overflow-y-auto
- inputs: h-10 text-base (evita zoom iOS)
- height full: h-dvh (não h-screen)
- safe-area: pb-[env(safe-area-inset-bottom)] em footers fixos
```

Pronto para começar pela Fase 1 assim que aprovado.
