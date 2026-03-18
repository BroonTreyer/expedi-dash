

# Remover Cadastro Rápido (já admin-only para editar/excluir)

## Análise
- **Editar e Excluir**: Já estão restritos a admin (`isAdmin` check) tanto no `HistoricoTab` quanto no `MovimentoDetailsDialog`. Nenhuma mudança necessária.
- **Cadastro Rápido (Entrada Express)**: Precisa ser removido completamente.

## Mudanças

### 1. `src/pages/Portaria.tsx`
- Remover import do `EntradaExpressForm`
- Remover state `showExpress` e o botão "Rápida"
- Remover o bloco `{showExpress && <EntradaExpressForm ... />}`
- Remover import do ícone `Zap`

### 2. `src/components/portaria/EntradaExpressForm.tsx`
- Deletar o arquivo (não será mais usado)

| Arquivo | Mudança |
|---------|---------|
| `src/pages/Portaria.tsx` | Remover entrada rápida (state, botão, componente) |
| `src/components/portaria/EntradaExpressForm.tsx` | Excluir arquivo |

