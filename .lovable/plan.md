

# Agrupar por Cliente (codigo_cliente) em vez de N° Pedido

## Resumo
Remover a coluna "N° Pedido" da tabela e trocar a lógica de agrupamento: em vez de agrupar por `numero_pedido`, agrupar por `codigo_cliente`.

## Mudanças

### 1. `src/components/dashboard/CarregamentoTable.tsx`
- **`Group` interface**: trocar `pedido: number | null` por `codigoCliente: string | null`
- **`buildGroups`**: agrupar por `codigo_cliente` em vez de `numero_pedido`. Itens sem `codigo_cliente` ficam como singles.
- **`expanded` state**: trocar `Set<number>` por `Set<string>` (código do cliente é string)
- **Coluna "N. Pedido"**: remover do `<TableHeader>` e de todas as rows (summary, single, expanded)
- **Summary row do grupo**: exibir o código + nome do cliente no lugar do "Pedido #X"
- **`colCount`**: ajustar (-1 pela remoção da coluna pedido)
- **Mobile (`MobileCardView`)**: mesma lógica — agrupar por cliente, remover referências a `numero_pedido` no header do accordion

### 2. `src/components/dashboard/KpiCards.tsx`
- O KPI "Total Pedidos" conta pedidos únicos por `numero_pedido`. Trocar para contar **clientes únicos** (`codigo_cliente`) ou manter contando pedidos únicos — depende da preferência. Vou manter contando pedidos únicos mas renomear se necessário, ou trocar para contar clientes.

### 3. `src/components/dashboard/KanbanView.tsx`
- Sem agrupamento atualmente, não precisa mudar.

### 4. `src/components/dashboard/CarregamentoDialog.tsx`
- O campo `numero_pedido` continua existindo no banco e no formulário (o usuário pediu apenas para remover da tabela e mudar o agrupamento). Se quiser remover do formulário também, confirmar com o usuário.

## Nota
O campo `numero_pedido` permanece no banco de dados e no formulário de cadastro. A mudança é apenas visual na tabela/kanban: agrupamento por `codigo_cliente` e remoção da coluna "N° Pedido".

