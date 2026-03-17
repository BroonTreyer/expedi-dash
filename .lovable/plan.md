

# Ordenação por coluna em todas as tabelas

Adicionar funcionalidade de clique nos cabeçalhos das tabelas para ordenar por qualquer coluna, com indicador visual (seta ↑/↓) em todas as páginas do sistema.

## Abordagem

Criar um hook reutilizável `useSortableTable` e um componente `SortableTableHead` para evitar duplicação de código.

### 1. Criar hook `src/hooks/useSortableTable.ts`
- Estado: `sortKey` (string | null) e `sortDirection` ("asc" | "desc")
- Função `toggleSort(key)`: alterna entre asc → desc → null
- Função `sortData(data, accessors)`: ordena o array com base na key e direction
- Suporta strings (locale compare pt-BR), números, e booleanos

### 2. Criar componente `SortableTableHead`
- Wraps `TableHead` com onClick para chamar toggleSort
- Mostra ícone `ArrowUp`/`ArrowDown`/`ArrowUpDown` conforme o estado
- Cursor pointer e hover visual para indicar que é clicável

### 3. Aplicar nas páginas (6 tabelas)

**CarregamentoTable.tsx** (Dashboard principal + Rupturas):
- Colunas ordenáveis: Etapa, Status, Vendedor, Cód. Produto, Produto, Peso, Caminhão, Motorista, Cliente, Cidade, UF, Frete
- Ordenar os dados antes do `buildGroups` ou diretamente no array `data`

**Consolidado.tsx**:
- Colunas ordenáveis: Status, Tipo, Placa, Motorista, Peso, Pedidos, Clientes, UFs

**Clientes.tsx**:
- Colunas ordenáveis: Código, Nome, Cidade, UF, Status

**Vendedores.tsx**:
- Colunas ordenáveis: Código, Nome, Status

**Produtos.tsx**:
- Colunas ordenáveis: Código, Nome, Peso Padrão, Status

**TiposCaminhao.tsx**:
- Coluna ordenável: Nome

### Detalhes técnicos

```typescript
// useSortableTable.ts
type SortDir = "asc" | "desc";
interface SortState { key: string | null; dir: SortDir }

function useSortableTable(defaultKey?: string) {
  const [sort, setSort] = useState<SortState>({ key: defaultKey ?? null, dir: "asc" });
  
  const toggleSort = (key: string) => {
    setSort(prev => {
      if (prev.key === key) return { key, dir: prev.dir === "asc" ? "desc" : "asc" };
      return { key, dir: "asc" };
    });
  };

  const sortData = <T,>(data: T[], accessor: (item: T) => any): T[] => {
    if (!sort.key) return data;
    return [...data].sort((a, b) => {
      const va = accessor(a); const vb = accessor(b);
      // null/undefined always last
      // string: localeCompare, number: subtract, boolean: true first
      return sort.dir === "asc" ? compare(va, vb) : compare(vb, va);
    });
  };

  return { sort, toggleSort, sortData };
}
```

```tsx
// SortableTableHead — visual
<TableHead onClick={() => toggleSort(key)} className="cursor-pointer select-none hover:bg-muted/60">
  <div className="flex items-center gap-1">
    {children}
    {sort.key === key ? (sort.dir === "asc" ? <ArrowUp /> : <ArrowDown />) : <ArrowUpDown className="opacity-30" />}
  </div>
</TableHead>
```

### Arquivos a editar
- `src/hooks/useSortableTable.ts` (novo)
- `src/components/ui/sortable-table-head.tsx` (novo)
- `src/components/dashboard/CarregamentoTable.tsx`
- `src/pages/Consolidado.tsx`
- `src/pages/Clientes.tsx`
- `src/pages/Vendedores.tsx`
- `src/pages/Produtos.tsx`
- `src/pages/TiposCaminhao.tsx`

