

# Auditoria de bugs e problemas encontrados

Analisei todo o código do painel e encontrei os seguintes problemas:

## Bugs Encontrados

### 1. Mudança de status em pedido agrupado muda apenas o primeiro item
Em `CarregamentoTable.tsx` linha 387, o `StatusSelect` do grupo chama `onStatusChange(first.id, s)`, alterando apenas o primeiro item. Os demais itens do mesmo pedido ficam com status diferente, gerando inconsistencia.

### 2. Botão excluir no grupo apaga apenas o primeiro item
Linha 421: `onDelete(first.id)` exclui somente o primeiro registro do grupo, deixando os demais orfaos.

### 3. Agrupamento assume itens contiguos no array
`buildGroups()` agrupa apenas itens consecutivos com o mesmo `numero_pedido`. Se os itens forem criados em momentos diferentes (intercalados com outros pedidos), nao serao agrupados corretamente.

### 4. Itens com status de ruptura ficam invisíveis no Kanban
O `KanbanView` renderiza colunas apenas para `STATUSES` (Aguardando, Separando, etc.). Itens com status "Aguardando pedido" (de rupturas) nao aparecem em nenhuma coluna.

### 5. Filtro de status no dashboard nao inclui status de ruptura
O `Filters.tsx` lista apenas `STATUSES`. Itens com status "Aguardando pedido" nao podem ser filtrados e nao correspondem a nenhum valor do dropdown.

### 6. Calculo de `colCount` incorreto
Linha 249: base de 11, mas contando as colunas fixas (chevron, pedido, status, vendedor, cod.produto, produto, caminhao, motorista, cliente, UF, inicio, fim, obs) sao 13. Isso faz o `colSpan` da mensagem "Nenhum carregamento" ficar menor que deveria.

### 7. Warning de ref no AppSidebar
O `TooltipTrigger asChild` tenta passar ref para o componente `Link` do react-router-dom que nao usa `forwardRef`. Gera warning no console.

### 8. Rupturas: status nao muda corretamente para faturamento
Em `Rupturas.tsx` linha 63, `handleStatusChange` so permite admin/logistica, mas na dashboard principal tambem permite faturamento. Inconsistencia de permissoes.

---

## Plano de correção

### Arquivo: `src/components/dashboard/CarregamentoTable.tsx`
- **buildGroups**: Refatorar para agrupar por `numero_pedido` usando um Map, independente da ordem no array.
- **Status do grupo**: Ao mudar status no header do grupo, chamar `onStatusChange` para todos os itens do grupo.
- **Delete do grupo**: Ao excluir no header, excluir todos os itens do grupo (ou expandir para forçar exclusao individual).
- **colCount**: Corrigir base de 11 para 13.

### Arquivo: `src/components/dashboard/KanbanView.tsx`
- Incluir itens com status fora de `STATUSES` em uma coluna "Outros" ou filtrar esses itens antes de exibir o Kanban.

### Arquivo: `src/components/dashboard/Filters.tsx`
- Adicionar os status de ruptura ao dropdown, ou combinar ambos os conjuntos de status.

### Arquivo: `src/components/AppSidebar.tsx`
- Envolver o `Link` em um `forwardRef` wrapper ou usar um `<a>` como intermediario para o `TooltipTrigger`.

### Arquivo: `src/pages/Rupturas.tsx`
- Alinhar permissoes de `handleStatusChange` com a dashboard principal (incluir faturamento se necessario).

## Arquivos (5)
- `src/components/dashboard/CarregamentoTable.tsx`
- `src/components/dashboard/KanbanView.tsx`
- `src/components/dashboard/Filters.tsx`
- `src/components/AppSidebar.tsx`
- `src/pages/Rupturas.tsx`

