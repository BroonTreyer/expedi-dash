

# Nova aba "Consolidado" - Cargas por Veículo

## Objetivo
Criar uma nova pagina `/consolidado` que exibe as cargas fechadas (com `carga_id` preenchido), agrupadas por veículo e dia, com KPIs e filtros.

## Estrutura

### 1. Nova pagina `src/pages/Consolidado.tsx`
- Seletor de data (com range ou dia único, similar ao painel)
- **KPI Cards**: Quantidade de veículos, peso total, distribuição por tipo de caminhão
- **Tabela agrupada por carga_id** com colunas: Data, Carga ID, Tipo Caminhão, Placa, Motorista, Peso Total, Qtd Pedidos, Clientes atendidos
- Expandir cada carga para ver detalhes dos pedidos dentro dela

### 2. Filtros
- Data (seletor de dia)
- UF / Região (select)
- Vendedor (multi-select, reutilizando o componente existente)
- Tipo de Caminhão (select)

### 3. Dados
- Query na tabela `carregamentos_dia` filtrando `carga_id IS NOT NULL`
- Agrupamento client-side por `carga_id` para montar cards e tabela
- Reutilizar hook existente ou criar `useConsolidado` com query específica (sem filtro de data fixo, para permitir range)

### 4. Navegação
- Adicionar item "Consolidado" no `AppSidebar.tsx` com ícone `ClipboardList` para roles `admin`, `logistica`, `faturamento`
- Adicionar rota em `App.tsx` com `allowedRoles={["admin", "logistica", "faturamento"]}`

### 5. KPIs exibidos
- Total de veículos (cargas distintas)
- Peso total consolidado
- Quantidade de pedidos
- Breakdown por tipo de caminhão (ex: "3 Carretas, 2 Bitrucks")

## Arquivos
- **Novo**: `src/pages/Consolidado.tsx`
- **Editar**: `src/App.tsx` (rota), `src/components/AppSidebar.tsx` (nav item)

