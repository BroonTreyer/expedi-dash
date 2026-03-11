

# Ajustar permissões no CarregamentoTable

## Situação atual
As páginas (Index.tsx e Rupturas.tsx) já passam o `role` corretamente, mas dentro do **CarregamentoTable.tsx** os botões de ação ainda estão com guards desatualizados:
- Editar e Excluir: só aparecem para `isAdmin`
- Completar logística: aparece para `isAdmin || isLogistica`
- Coluna de ações: aparece para `isAdmin || isLogistica`

## Permissões desejadas
| Ação | Admin | Faturamento | Logística |
|------|-------|-------------|-----------|
| Criar pedido | Sim | Sim | Não |
| Editar pedido | Sim | Sim | Não |
| Excluir pedido | Sim | Não | Não |
| Alterar status | Sim | Sim | Sim |
| Completar logística | Sim | Sim | Sim |

## Mudanças — `CarregamentoTable.tsx`

1. Adicionar `isFaturamento = userRole === "faturamento"` (desktop e mobile)
2. Atualizar `canChangeStatus` para incluir `isFaturamento`
3. Coluna de ações: visível para `isAdmin || isLogistica || isFaturamento`
4. Botão **Completar**: `isAdmin || isLogistica || isFaturamento`
5. Botão **Editar**: `isAdmin || isFaturamento`
6. Botão **Excluir**: permanece só `isAdmin`

Aplicar em 3 locais: desktop single-row, desktop group-summary-row, e mobile card.

