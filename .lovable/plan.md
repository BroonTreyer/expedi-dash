

# Ajustar permissões: Faturamento, Logística e Dados de Transporte

## Regras corrigidas

| Ação | Admin | Faturamento | Logística |
|------|-------|-------------|-----------|
| Criar pedido | Sim | Sim | Não |
| Editar pedido | Sim | Sim | Não |
| Excluir pedido | Sim | Não | Não |
| Alterar status | Sim | Sim | Sim |
| Completar logística (dados de transporte) | Sim | **Não** | Sim |

## Mudanças

### 1. `src/pages/Index.tsx` — `handleComplete`
- Remover `isFaturamento` da guard. Fica: `if (!isAdmin && !isLogistica) return;`

### 2. `src/pages/Rupturas.tsx` — `handleComplete`
- Mesmo ajuste: remover `isFaturamento`. Fica: `if (!isAdmin && !isLogistica) return;`

### 3. `src/components/dashboard/CarregamentoTable.tsx`
- Separar permissão do botão "Completar logística" (ícone ClipboardCheck) do `canEdit`.
- Criar `canComplete = isAdmin || isLogistica` (sem faturamento).
- `canEdit` permanece `isAdmin || isFaturamento` (sem logística).
- Aplicar `canComplete` no botão de completar em 3 locais: desktop single-row, desktop group-row, e mobile card.
- Logística **não** vê botão de editar (já correto com `canEdit`).

## Arquivos (3)
- `src/pages/Index.tsx`
- `src/pages/Rupturas.tsx`
- `src/components/dashboard/CarregamentoTable.tsx`

