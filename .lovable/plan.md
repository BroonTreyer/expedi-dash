

# Sidebar mais escura + Peso × Quantidade automático

## 1. Sidebar mais escura
Alterar as variáveis CSS do sidebar em `src/index.css`:
- `--sidebar-background`: de `358 76% 48%` → `358 76% 30%` (vermelho mais escuro)
- `--sidebar-accent`: de `358 76% 42%` → `358 76% 25%`
- `--sidebar-border`: de `358 76% 40%` → `358 76% 22%`

## 2. Peso automático com quantidade
Em `src/components/dashboard/CarregamentoDialog.tsx`:
- Guardar o `peso_padrao` do produto selecionado no state (peso unitário por caixa)
- Quando o produto é selecionado: `peso = peso_padrao × quantidade`
- Quando a quantidade muda: recalcular `peso = peso_padrao × nova_quantidade`
- O usuário ainda pode editar o peso manualmente depois

