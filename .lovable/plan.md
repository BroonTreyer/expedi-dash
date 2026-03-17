

# Correção de Bugs no Sistema

## Bugs identificados

### 1. Console Error: `TooltipProvider` como filho direto de `TableBody`
Na tabela do Consolidado (linha 247), `<TooltipProvider>` é usado como wrapper de cada grupo dentro de `<TableBody>`. Isso causa o erro "Function components cannot be given refs" porque `<TableBody>` espera elementos `<tr>` como filhos diretos, não componentes funcionais sem `forwardRef`.

**Correção**: Remover o `<TooltipProvider>` de dentro do `.map()` na tabela. Já existe um `<TooltipProvider>` pai na página (linha 203), então ele é redundante.

### 2. Cálculo de `qtdPedidos` conta itens, não pedidos distintos
No `groupByCarga`, `qtdPedidos` incrementa +1 para cada item (linha de produto). Um pedido pode ter múltiplos itens/produtos. Para ser preciso, deveria contar `numero_pedido` distintos.

**Correção**: Usar um `Set<number>` para `numero_pedido` e retornar `.size` como `qtdPedidos`.

### 3. Acesso ao Consolidado
A rota já está configurada para `admin`, `logistica` e `faturamento` tanto no `App.tsx` quanto no `AppSidebar.tsx` — sem problema aqui.

## Arquivos a editar

### `src/pages/Consolidado.tsx`
1. Remover `<TooltipProvider key={g.cargaId}>` wrapper dentro do `TableBody` — usar `React.Fragment` com key
2. Corrigir contagem de pedidos para usar pedidos distintos (por `numero_pedido`)

