
## O que o usuário quer

1. **Consolidado**: A coluna "Carga" (nomeCarga) já existe na tabela, mas precisa funcionar como agrupador visual — pedidos com mesmo `nome_carga` devem aparecer unificados (comportamento parecido com o que já acontece com `carga_id`, mas agora com exibição destacada do nome).

2. **Rupturas**: Adicionar coluna "Carga" na tabela de rupturas (e no resumo por produto), para que seja possível identificar qual carga está travada por conta da falta de produto.

### Análise do estado atual

**Consolidado** (`src/pages/Consolidado.tsx`):
- Já agrupa por `carga_id` e já exibe `nomeCarga` na coluna "Carga" (linha 442: `g.nomeCarga ?? "—"`)
- O problema é que o usuário quer que o `nome_carga` seja mais destacado/identificável como o agrupador principal — não só mais uma coluna
- Na visão desktop já tem a coluna "Carga" na posição correta, mas visualmente não está destacada como identidade da carga
- **O que falta**: na visão expandida dos sub-itens (linhas 448-462), o nome da carga não aparece; está OK mas pode precisar de badge/destaque

**Rupturas** (`src/pages/Rupturas.tsx`):
- `CarregamentoTable` é chamado com `hideColumns={["etapa", "qtd", "peso"]}` — sem coluna de nome de carga
- A tabela `CarregamentoTable` (`CarregamentoTable.tsx`) não tem coluna para `nome_carga` / `carga_id` — essa coluna não existe no componente compartilhado
- O `Carregamento` type tem `nome_carga: string | null` e `carga_id: string | null`
- O resumo por produto (tabela de produtos) também não mostra a carga

### O que precisa mudar

#### 1. `CarregamentoTable.tsx` — adicionar coluna "Carga"
- Adicionar coluna `nome_carga` ao header e às rows da tabela desktop
- Adicionar ao `hideColumns` o controle para mostrar/esconder (key `"nome_carga"`)
- No mobile, adicionar linha "Carga" no grid de detalhes do item
- Adicionar ao `sortAccessors`: `nome_carga: (c) => c.nome_carga ?? ""`

#### 2. `Rupturas.tsx` — mostrar coluna + filtro de carga
- Remover `"nome_carga"` do `hideColumns` (ou não adicioná-lo — por padrão aparece)
- Adicionar filtro de "Nome da Carga" nos filtros da página (Select com as cargas únicas das rupturas)
- No estado `rupturas` (useMemo), aplicar o filtro de carga quando selecionado
- No "Resumo por Produto", adicionar coluna "Cargas afetadas" mostrando os nomes das cargas vinculadas àquele produto

#### 3. `Consolidado.tsx` — destacar nome da carga
- Já está correto na tabela, mas adicionar badge visual ao `nomeCarga` nas linhas da tabela desktop para distingui-lo visualmente de colunas textuais comuns
- Nos sub-itens expandidos, mostrar o `nome_carga` como badge para reforçar a identificação

### Arquivos a editar

| Arquivo | Mudança |
|---|---|
| `src/components/dashboard/CarregamentoTable.tsx` | Adicionar coluna `nome_carga` (desktop + mobile), com suporte a `hideColumns` |
| `src/pages/Rupturas.tsx` | (1) Não esconder coluna nome_carga; (2) Adicionar filtro de carga; (3) Atualizar resumo por produto com coluna "Cargas afetadas" |
| `src/pages/Consolidado.tsx` | Destacar badge do nome da carga nas linhas da tabela e nos sub-itens |

### Detalhes de implementação

**CarregamentoTable.tsx**:
```tsx
// No header desktop, após coluna UF ou em posição configurável:
{!hideColumns.includes("nome_carga") && (
  <SortableTableHead sort={sort} sortKey="nome_carga" onSort={toggleSort}>Carga</SortableTableHead>
)}

// Na row de cada item:
{!hideColumns.includes("nome_carga") && (
  <TableCell className="text-xs">
    {c.nome_carga ? (
      <Badge variant="outline" className="text-xs font-mono">{c.nome_carga}</Badge>
    ) : <span className="text-muted-foreground/50">—</span>}
  </TableCell>
)}

// No sortAccessors:
nome_carga: (c) => c.nome_carga ?? "",
```

**Rupturas.tsx**:
```tsx
// Novo estado de filtro
const [cargaFilter, setCargaFilter] = useState("todos");

// Cargas únicas nas rupturas
const rupturaCargas = useMemo(() => 
  [...new Set(carregamentos.filter(c => c.ruptura && c.nome_carga).map(c => c.nome_carga!))]
    .sort(), [carregamentos]);

// Filtro no useMemo de rupturas
if (cargaFilter !== "todos" && c.nome_carga !== cargaFilter) return false;

// No productSummary, adicionar set de cargas por produto:
{ codigo, nome, count, peso, cargas: Set<string> }

// Coluna adicional no resumo desktop:
<TableHead className="text-xs">Cargas Afetadas</TableHead>
// célula:
<TableCell className="text-xs">{[...p.cargas].join(", ") || "—"}</TableCell>

// Filtros — 4 colunas quando há cargas
// Não passar nome_carga no hideColumns do CarregamentoTable
hideColumns={["etapa", "qtd", "peso"]}  // nome_carga agora aparece
```

**Consolidado.tsx**:
```tsx
// Badge no nome da carga na tabela principal (linha 442):
<TableCell className="text-xs">
  {g.nomeCarga ? (
    <Badge variant="secondary" className="font-mono text-xs">{g.nomeCarga}</Badge>
  ) : "—"}
</TableCell>

// Nos sub-itens expandidos (linha 453), adicionar referência ao nome da carga como contexto visual
```

**colCount** no CarregamentoTable deve ser incrementado quando `nome_carga` não está no `hideColumns`.
