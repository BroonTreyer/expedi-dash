

# Alterações na página Consolidado

## Mudanças

### 1. Remover da tabela
- Coluna "Carga" (carga_id)

### 2. Remover filtros
- Vendedor (MultiSelectFilter)
- Tipo Caminhão (Select)
- Remover imports/estados associados (`filterVendedor`, `filterTipo`, `useVendedores`, `useTiposCaminhao`)

### 3. Adicionar filtro de Status
- Select com opções: "Todos", + cada status de `STATUSES` (constants.ts)
- Estado `filterStatus` — filtra os itens antes do agrupamento

### 4. Adicionar coluna Status na tabela
- Nova coluna "Status" no header da tabela de grupos
- Exibir o status predominante da carga (ou o primeiro item)
- Usar `StatusSelect` para permitir alteração inline — ao mudar, atualiza todos os itens da carga via mutation (`supabase.from('carregamentos_dia').update({ status }).in('id', ids)`)
- Adicionar `useMutation` + `useQueryClient` para invalidar cache após update

### 5. Corrigir soma de Pedidos
- O KPI "Pedidos" já soma `qtdPedidos` por grupo, mas o `qtdPedidos` conta `numero_pedido` distintos por carga. Verificar se o bug é que itens sem `numero_pedido` não são contados, ou se a contagem está correta mas o total não está sendo exibido. Provavelmente o problema é que pedidos com mesmo `numero_pedido` em cargas diferentes são contados separadamente — o total geral precisa contar pedidos únicos globalmente.

### Arquivo editado
- `src/pages/Consolidado.tsx`

