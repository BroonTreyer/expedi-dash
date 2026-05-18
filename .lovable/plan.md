## Objetivo

Deixar mais claro, na tabela de rupturas do PDF da pré-carga, o que significa cada coluna de peso — especialmente que "Original" é o **peso total do pedido** e "Diferença" é o **peso em ruptura**.

## O que muda

Apenas labels (texto), em `src/components/precargas/PreCargaPrintDialog.tsx`, no cabeçalho da tabela de "Rupturas detalhadas":

| Hoje | Vai virar |
|---|---|
| Original | Peso Total (kg) |
| Carregado | Carregado (kg) |
| Diferença | Ruptura (kg) |
| Tipo | Tipo de ruptura |

O título da seção também muda de **"Rupturas detalhadas"** para **"Produtos em ruptura"**, e o rodapé passa de `"X rupturas / Y kg em ruptura"` para `"Total em ruptura: Y kg (X itens)"`.

Nenhum cálculo muda — só os rótulos. Continua usando `pesoEfetivo` (carregado) e `pesoNaoCarregado` (ruptura), e `original = carregado + ruptura`.

## Arquivos alterados

- `src/components/precargas/PreCargaPrintDialog.tsx`
