

# Mostrar Badge de Data Prevista no Dialog de Detalhes do Movimento

## Problema

Ao abrir os detalhes de um movimento (entrada/retorno), não há indicação se o veículo foi carregado no dia previsto, antes ou depois da data de referência da planilha.

## Solução

No `MovimentoDetailsDialog`, buscar na tabela `veiculos_esperados` se existe um registro com a mesma placa. Comparar a `data_referencia` (data prevista) com a data real da entrada (`data_hora` do movimento) e exibir um badge:

- **Verde** — "No prazo DD/MM" (entrada no mesmo dia da data prevista)
- **Amarelo** — "Antecipado DD/MM" (entrada antes da data prevista)
- **Vermelho** — "Atrasado DD/MM" (entrada depois da data prevista)

### Mudanças

**`src/components/portaria/MovimentoDetailsDialog.tsx`**:
1. Importar `useQuery` e `supabase` para buscar `veiculos_esperados` pela placa do movimento
2. Comparar `data_referencia` do veículo esperado com a data do `data_hora` do movimento (só a parte date)
3. Exibir o badge correspondente na seção de header badges (ao lado de "Entrada", "Carga Própria", etc.)
4. Se não houver veículo esperado para aquela placa, não mostra nada

| Arquivo | Mudança |
|---|---|
| `src/components/portaria/MovimentoDetailsDialog.tsx` | Buscar `veiculos_esperados` pela placa, comparar datas, exibir badge colorido |

