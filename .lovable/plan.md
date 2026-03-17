

# Ocultar finalizados do painel + atalho para Consolidado

## Contexto
Atualmente o painel principal mostra todos os itens do dia, incluindo os que já foram carregados (com `carga_id` preenchido e etapa `logistica`). O usuário quer que itens finalizados (status "Carregado") sumam da lista principal e só apareçam no Consolidado.

## Alterações

### 1. Filtrar itens finalizados do painel principal (`src/pages/Index.tsx`)
- No `useMemo` de `filtered`, adicionar condição para excluir itens com status `"Carregado"` (estes já estão consolidados)
- Manter visíveis itens em outros status, mesmo com `carga_id` preenchido (ex: "Carregando", "Pronto para carregar") pois ainda estão em processo

### 2. Atalho "Ver Finalizados" no painel (`src/pages/Index.tsx`)
- Adicionar um botão/link ao lado dos botões de view (Tabela/Kanban) ou abaixo dos KPIs
- Texto: "Ver Finalizados" com ícone `PackageCheck` ou similar
- Navega para `/consolidado?data={filtros.data}` usando `useNavigate`
- Mostrar junto a um badge com a contagem de itens carregados ocultos do dia

### 3. Consolidado receber data via query param (`src/pages/Consolidado.tsx`)
- Ler `?data=YYYY-MM-DD` da URL para inicializar o seletor de data, facilitando a navegação do atalho

## Arquivos a editar
- `src/pages/Index.tsx` — filtro + botão atalho
- `src/pages/Consolidado.tsx` — ler query param de data

