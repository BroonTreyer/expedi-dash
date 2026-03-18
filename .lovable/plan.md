

# Centralizar coluna Status em todas as tabelas

## Problema
O `StatusSelect` e `StatusBadge` ficam alinhados à esquerda na coluna Status, causando desalinhamento visual — especialmente porque os badges têm larguras variáveis.

## Solução
Centralizar o conteúdo da coluna Status (header + cells) em todos os locais:

### 1. `StatusSelect.tsx`
- Adicionar `justify-center` no SelectTrigger para centralizar o conteúdo

### 2. `StatusBadge.tsx`
- Envolver o Badge em um `div` com `flex justify-center`, ou adicionar `block mx-auto` no Badge

### 3. `CarregamentoTable.tsx` (Dashboard)
- Header: adicionar `text-center` no SortableTableHead do Status (linha 368)
- Cells: adicionar `text-center` nas TableCell do Status (linhas 417, 541)

### 4. `Consolidado.tsx`
- Header do Status: adicionar `text-center`
- Cell do Status (linha 412): adicionar `text-center`

### 5. `SortableTableHead.tsx`
- Adicionar `justify-center` condicional no flex container quando a classe `text-center` estiver presente, ou simplesmente garantir que o conteúdo centraliza quando `text-center` é aplicado

Abordagem mais limpa: em vez de mexer em cada célula, centralizar diretamente nos componentes `StatusSelect` e `StatusBadge` adicionando `w-full flex justify-center` wrapper, e marcar os headers com `text-center`.

