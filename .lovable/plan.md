

# Exibir Tipo de Veículo nos Detalhes do Movimento

## Problema

O campo `tipo_caminhao` é salvo no banco mas não aparece na tela "Detalhes do Movimento".

## Solução

Adicionar uma linha `<DetailRow label="Tipo de Veículo" value={m.tipo_caminhao} />` na seção "Basic info" do `MovimentoDetailsDialog.tsx`, junto com Placa, Motorista e Empresa (linha ~304).

| Arquivo | Mudança |
|---|---|
| `src/components/portaria/MovimentoDetailsDialog.tsx` | Adicionar `DetailRow` para `tipo_caminhao` na seção de informações básicas |

