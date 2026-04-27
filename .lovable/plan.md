# Limpar ações na linha do produto (item filho)

Na visão expandida de um pedido com múltiplos produtos, as linhas filhas (cada produto individual) atualmente exibem 5 botões: Completar logística, Editar, Clonar, Excluir e Histórico. A solicitação é manter **apenas o ícone de Histórico** nessas linhas.

As ações de pedido (editar, clonar, excluir, completar) permanecem no **cabeçalho do pedido** — que é o local correto, já que essas operações sempre afetam o pedido inteiro.

## Alterações

### `src/components/dashboard/CarregamentoTable.tsx`

**1. Tabela desktop — linha do produto filho (linhas ~814-833)**

Remover os 4 botões (Completar, Editar, Clonar, Excluir), preservando apenas o `<AuditTimeline>` (Histórico).

**2. Card mobile — `MobileCardItem` quando `isGrouped === true` (linhas ~228-267)**

Os mesmos 4 botões aparecem no card mobile do produto filho. Adicionar a guarda `!isGrouped &&` em cada um deles, mantendo o `<AuditTimeline>` sempre visível.

## Resultado

- **Cabeçalho do pedido**: Completar / Editar / Clonar / Excluir / Histórico (inalterado).
- **Linha do produto (filho)**: apenas Histórico.
- Pedidos de produto único: inalterados — ainda têm todas as ações pois não são linhas filhas.