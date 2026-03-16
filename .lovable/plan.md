

# Correções na página de Rupturas e Filtros

## 1. Remover filtros de Etapa e Status (ambas as páginas)

**`src/components/dashboard/Filters.tsx`** — Remover os selects de Etapa e Status da view padrão (admin/faturamento). Ordem final: Data → Vendedor → Cliente → UF → Tipo Caminhão → Ruptura → Busca

**`src/pages/Rupturas.tsx`** — Remover o select de Status dos filtros locais da página de rupturas.

## 2. Filtros dinâmicos (só mostrar quem tem pedido)

**`src/components/dashboard/Filters.tsx`** e **`src/pages/Index.tsx`**:
- Passar a lista de `carregamentos` (dados filtrados por data) para o Filters
- Derivar no Filters os vendedores, clientes e UFs que realmente têm pedidos no dia, cruzando com os dados recebidos
- Exemplo: só mostrar no select de Vendedor os vendedores cujo `id` aparece em algum `carregamento.vendedor_id`

**`src/pages/Rupturas.tsx`** — Mesma lógica: derivar vendedores com rupturas no dia.

## 3. Remover scrollbar duplicada

**`src/components/dashboard/CarregamentoTable.tsx`** — O container `overflow-x-auto` com `[scrollbar-width:none]` deveria esconder a nativa, mas parece estar falhando. Verificar e garantir que o CSS oculta completamente a barra nativa, mantendo apenas o proxy sticky no bottom. Adicionar fallback com `overflow-x: scroll` + esconder via `-ms-overflow-style: none` para Edge.

## 4. Soma por código de produto nas Rupturas

**`src/pages/Rupturas.tsx`** — Após os KPI cards atuais (Total Rupturas / Peso Total), adicionar uma tabela/lista resumo agrupando rupturas por `codigo_produto` + `nome_produto`, mostrando:
- Código do produto
- Nome do produto  
- Quantidade de rupturas (count)
- Peso total daquele produto

Renderizar como uma mini-tabela ou grid de cards compactos abaixo dos KPIs existentes, com scroll horizontal se necessário.

## Arquivos editados
- `src/components/dashboard/Filters.tsx`
- `src/pages/Index.tsx`
- `src/pages/Rupturas.tsx`
- `src/components/dashboard/CarregamentoTable.tsx`

