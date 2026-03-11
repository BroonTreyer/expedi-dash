

# Auditoria de Acessos + Pedidos com Numero e Produtos Agrupados

## Parte 1: Auditoria de Acessos

### Situacao Atual vs Recomendado

**Logistica** (Painel, Rupturas, Tipos de Caminhao):
- Painel: pode mudar status e completar logistica -- correto
- Painel: nao pode criar/editar/excluir pedidos -- correto
- Rupturas: botao "Novo Pedido (Ruptura)" aparece sem verificacao de role -- **BUG, deve esconder para logistica**
- Rupturas: pode mudar status e completar logistica -- correto
- Tipos de Caminhao: CRUD completo -- correto, e dominio deles

**Faturamento** (Painel, Rupturas, Produtos, Vendedores, Clientes):
- Painel: somente visualizacao (nao pode criar, editar, excluir, mudar status) -- correto
- Rupturas: botao "Novo Pedido (Ruptura)" aparece sem verificacao -- **BUG, faturamento nao deveria criar pedidos**
- Rupturas: nao pode mudar status -- correto
- Produtos/Vendedores/Clientes: CRUD completo -- correto, e dominio deles (cadastros)

### Correcoes necessarias
- `src/pages/Rupturas.tsx`: esconder botao "Novo Pedido (Ruptura)" para quem nao e admin
- Faturamento no Painel nao precisa de mudanca (ja e somente leitura)

---

## Parte 2: Numero do Pedido + Produtos Agrupados

### Abordagem
Adicionar coluna `numero_pedido` na tabela `carregamentos_dia`. Ao criar um pedido com multiplos produtos, todos recebem o mesmo `numero_pedido`. A tabela agrupa visualmente os itens do mesmo pedido.

### Banco de Dados
1. **Migration**: Adicionar coluna `numero_pedido` (integer, nullable) a `carregamentos_dia`
2. **Sequence por dia**: Criar funcao que gera o proximo numero do pedido para a data (MAX + 1)
3. Dados existentes sem numero ficam com NULL (exibidos como "---")

### Mudancas no Codigo

**`src/hooks/useCarregamentos.ts`**:
- Adicionar `numero_pedido` ao tipo `Carregamento`
- No `useCreateCarregamento`, gerar o proximo numero antes de inserir (query MAX+1 para a data)

**`src/components/dashboard/CarregamentoDialog.tsx`**:
- Ao criar pedido, gerar um numero_pedido unico e aplicar a todos os itens do pedido

**`src/components/dashboard/CarregamentoTable.tsx`**:
- Adicionar coluna "N. Pedido" na tabela
- Agrupar visualmente linhas com mesmo numero_pedido (cor de fundo alternada ou separador)
- No mobile, mostrar o numero do pedido no card

**`src/pages/Index.tsx`**:
- Adicionar filtro por numero de pedido na busca

**`src/pages/Rupturas.tsx`**:
- Corrigir botao "Novo Pedido" (so admin)

### Fluxo de Criacao
1. Usuario clica "Novo Pedido"
2. Adiciona 1 ou mais produtos
3. Ao salvar, sistema busca `MAX(numero_pedido) WHERE data = X` e usa `MAX + 1`
4. Todos os itens sao inseridos com o mesmo `numero_pedido`

### Arquivos (5)
1. **Migration SQL** -- adicionar coluna `numero_pedido integer` 
2. **`src/hooks/useCarregamentos.ts`** -- tipo + logica de geracao do numero
3. **`src/components/dashboard/CarregamentoDialog.tsx`** -- passar numero_pedido nos itens
4. **`src/components/dashboard/CarregamentoTable.tsx`** -- coluna + agrupamento visual
5. **`src/pages/Rupturas.tsx`** -- corrigir permissao do botao

