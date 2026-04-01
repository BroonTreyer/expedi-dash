

# Reduzir tamanho dos resultados do Motorista Autocomplete

## O que será feito

Tornar os itens do dropdown de resultados mais compactos, especialmente em mobile (390px), onde nome + CPF + telefone ocupam muito espaço vertical.

## Mudanças

### `src/components/portaria/MotoristaAutocomplete.tsx`

- Reduzir padding dos itens de `px-3 py-2` para `px-2 py-1.5`
- Mudar layout de `flex justify-between` (lado a lado) para layout empilhado: nome na primeira linha, CPF e telefone na segunda linha em texto menor
- Reduzir fonte do nome de `text-sm font-medium` para `text-xs font-medium`
- CPF e telefone ficam `text-[11px]` numa linha abaixo do nome
- Reduzir `max-h-48` para `max-h-40`

Resultado: itens ~40% menores, mais legíveis em telas pequenas.

