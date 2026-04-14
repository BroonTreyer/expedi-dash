

# Diagnóstico da Portaria

## Problema encontrado

Existe **1 warning** no console:

> "Function components cannot be given refs. Attempts to access this ref will fail. Did you mean to use React.forwardRef()? Check the render method of `PatioAtualTab`."

O componente `SortableTableHead` é uma função simples, mas o `TableHead` interno usa `forwardRef`. Quando o React tenta passar um ref para `SortableTableHead` (dentro de `PatioAtualTab`), ele falha silenciosamente.

**Impacto**: Baixo. Não causa crash nem perda de funcionalidade, mas pode causar comportamento inesperado em scroll automático ou foco de acessibilidade.

## Nenhum outro erro

- Sem erros de runtime
- Sem falhas de rede (todas as requests retornam 200)
- Sem erros de TypeScript em build

## Correção

### `src/components/ui/sortable-table-head.tsx`
- Envolver o componente com `React.forwardRef` para que ele possa receber refs corretamente

1 arquivo alterado, correção trivial.

