

# Corrigir label do botão para terceirizados em Veículos Esperados

## Problema
O botão para terceirizados ainda diz **"Registrar Entrada"**, mas o fluxo de terceirizados começa com **Chegada** (não Entrada). A Entrada é liberada depois, numa segunda etapa.

## Correção

### `src/components/portaria/VeiculosEsperadosPanel.tsx`
- Trocar `"Registrar Entrada"` → **`"Registrar Chegada"`** nos dois locais (mobile linha 167, desktop linha 221)

| Grupo | Label atual | Label correto |
|-------|------------|---------------|
| PRÓPRIA | Registrar Saída p/ Rota ✅ | Mantém |
| Outros (terceirizado) | Registrar Entrada ❌ | **Registrar Chegada** |

1 arquivo, 2 linhas alteradas.

