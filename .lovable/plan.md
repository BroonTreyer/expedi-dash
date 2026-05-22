Você tem razão: ainda há blocos quebrando no mobile, principalmente em Pré-cargas. Vou tratar como varredura de responsividade de verdade, não como troca pontual de classes.

## Objetivo
Deixar todas as telas aptas para mobile e tablet, com leitura preservada, sem cortes horizontais indevidos, sem botões esmagados, sem cards estourando e com ações usáveis em 320px, 390px, 414px, tablet e desktop.

## Fase 1 — Correção imediata da tela atual: Pré-cargas

### Etapa 1 — Header, busca e ações
- Transformar o topo de Pré-cargas em layout mobile-first.
- Em mobile: título, descrição, busca e botão “Excel resumo” empilhados corretamente.
- Remover competição de largura entre input e botão.
- Garantir `min-w-0`, truncamento controlado e altura mínima de toque.

### Etapa 2 — KPIs e cards de carga
- Corrigir KPI “Em ruptura”, que hoje fica visualmente espremido.
- Em mobile pequeno, usar cards com conteúdo fluindo em linhas seguras.
- Evitar números longos quebrando feio ou invadindo o card.
- Ajustar card de carga para:
  - título longo não estourar;
  - badge de pedidos não comprimir título;
  - alerta de ruptura caber em linha/duas linhas;
  - botões PDF/Excel terem largura e espaçamento consistentes;
  - destinos longos não criarem overflow visual.

### Etapa 3 — Data do carregamento e acordeões
- Corrigir o bloco “Data do Carregamento” para ficar legível no mobile.
- Padronizar o input de data com largura adequada e sem corte.
- Revisar o texto auxiliar para quebrar linhas naturalmente.
- Ajustar “Pedidos e rupturas” para abrir/fechar sem deslocamentos estranhos.

## Fase 2 — Componentes compartilhados que afetam várias telas

### Etapa 4 — Componentes base
Revisar e ajustar os componentes reutilizáveis que espalham problemas pelo sistema:
- `CardHeader`, `CardContent` quando usados em páginas densas;
- `DialogContent` e `SheetContent` para mobile/tablet;
- `Tabs`, `Pagination`, `Popover`, `Select`, `Table`;
- botões com ícone + texto;
- inputs dentro de linhas flexíveis.

### Etapa 5 — Regras globais de proteção contra overflow
- Adicionar padrões seguros para:
  - `min-w-0` em containers flex/grid;
  - quebra de textos longos;
  - tabelas com rolagem horizontal intencional;
  - cards com `overflow-hidden` apenas onde não prejudica leitura;
  - tap targets mínimos no mobile.
- Não usar solução que esconda informação importante.

## Fase 3 — Telas operacionais principais

### Etapa 6 — Logística, Consolidado, Expedição e Rupturas
- Revisar páginas de operação diária com foco em densidade e leitura.
- Ajustar filtros, KPIs, tabelas, cards, menus e ações.
- Garantir que tablet não fique com layout “meio desktop quebrado”.

### Etapa 7 — Portaria e fluxos de movimentação
- Revisar Portaria, RegistroEntrada, PortariaTerceirizado, PortariaCargaPropria e PortariaAdmin.
- Corrigir painéis, cards de veículos, formulários, botões, histórico, fotos e diálogos.
- Garantir uso confortável por celular na guarita.

## Fase 4 — Cadastros, relatórios e páginas administrativas

### Etapa 8 — Cadastros e tabelas administrativas
- Revisar Clientes, Produtos, Vendedores, Motoristas, Caminhões, Transportadoras, Usuários, Logs, Backups, Templates e Lixeira.
- Padronizar títulos, barras de ação, filtros, tabelas e estados vazios.
- Onde tabela for inevitável, garantir scroll horizontal claro e estável.

### Etapa 9 — Relatórios, Analytics, painéis e portal
- Revisar Relatórios, Analytics, MotoristasPainel, VendedoresPainel, PortalMotorista e Manual Técnico.
- Corrigir gráficos, cards, rankings, listas, impressões e visualizações públicas.

## Fase 5 — Validação rigorosa

### Etapa 10 — Auditoria visual por breakpoints
Validar os fluxos principais nos tamanhos:
- 320x568;
- 360x800;
- 390x844;
- 414x896;
- 768x1024;
- 820x1180;
- 1024x768.

Critérios de aprovação:
- nenhum texto importante cortado;
- nenhum botão inutilizável;
- nenhum card invadindo outro;
- nenhum overflow horizontal na página inteira, exceto tabelas intencionais;
- diálogos cabem na tela e rolam corretamente;
- menus e filtros continuam acessíveis;
- leitura preservada em mobile e tablet.

## Detalhes técnicos
- Implementação mobile-first com Tailwind responsivo.
- Preferir correções em componentes compartilhados quando o problema se repete.
- Usar `min-w-0`, `break-words`, `truncate` seletivo, `grid-cols-1`, `sm:grid-cols-*`, `md:grid-cols-*`, `overflow-x-auto` apenas em tabelas reais.
- Manter os tokens visuais existentes do projeto.
- Não alterar regra de negócio, banco de dados ou autenticação; foco exclusivo em responsividade e usabilidade visual.

Primeira entrega após aprovação: corrigir Pré-cargas completamente, porque é a tela atual onde a quebra está visível.