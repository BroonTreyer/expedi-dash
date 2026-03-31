

# Adicionar Badge para Veículos com Data Passada (Atrasados)

## Problema

Hoje existe apenas o badge amarelo "Saída DD/MM" para veículos com data futura (`dataRef > dataFiltrada`). Não há indicação visual quando um veículo já passou da data prevista e ainda está pendente.

## Solução

Adicionar uma função `isDataPassada` e um componente `DataAtrasadaBadge` (vermelho) para veículos onde `dataRef < dataFiltrada` e que ainda não foram conferidos.

### Mudanças em `VeiculosEsperadosPanel.tsx`

1. Criar `isDataPassada(dataRef, dataFiltrada)` — retorna `true` quando `dataRef < dataFiltrada`
2. Criar `DataAtrasadaBadge` — badge vermelho com ícone e texto "Atrasado DD/MM"
3. Nos cards mobile e na tabela desktop, exibir o badge vermelho quando `isDataPassada && !isConferido`
4. Adicionar destaque visual na linha/card (borda ou fundo vermelho suave)

| Arquivo | Mudança |
|---|---|
| `src/components/portaria/VeiculosEsperadosPanel.tsx` | Adicionar `isDataPassada`, `DataAtrasadaBadge`, exibir nos cards e tabela |

