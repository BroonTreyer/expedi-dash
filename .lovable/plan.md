

# Multi-select para filtros de Vendedor e Cliente

## Mudança

Atualmente os filtros de Vendedor e Cliente são `Select` com valor único (`string`). Vamos convertê-los para multi-select usando Popover + Checkbox, mantendo o visual compacto.

## Arquivos editados

### 1. `src/components/dashboard/Filters.tsx`
- Trocar os `<Select>` de Vendedor e Cliente por um componente de multi-select baseado em `Popover` + lista de `Checkbox`.
- O trigger exibe "Todos Vendedores" quando nenhum está selecionado, ou "2 vendedores" etc.
- Cada item tem um checkbox; clicar alterna a seleção.
- Botão "Limpar" para voltar a "todos".

### 2. `src/pages/Index.tsx`
- Mudar tipo dos filtros `vendedor` e `cliente` de `string` para `string[]` (array vazio = todos).
- Ajustar a lógica de filtragem em `filtered`:
  - `vendedor`: se array vazio → sem filtro; senão `filters.vendedor.includes(c.vendedor_id)`.
  - `cliente`: se array vazio → sem filtro; senão `filters.cliente.includes(c.codigo_cliente)`.
- Ajustar estado inicial: `vendedor: []`, `cliente: []`.

### 3. Novo componente `src/components/dashboard/MultiSelectFilter.tsx`
- Componente reutilizável que recebe `options: {value, label}[]`, `selected: string[]`, `onChange`, `placeholder`.
- Usa `Popover` + `Command` (ou lista simples com checkboxes) para selecionar múltiplos itens.
- Exibe badge com contagem quando há seleção.

## Lógica de filtragem (Index.tsx)
```text
vendedor: filters.vendedor.length === 0 || filters.vendedor.includes(c.vendedor_id)
cliente:  filters.cliente.length === 0  || filters.cliente.includes(c.codigo_cliente)
```

