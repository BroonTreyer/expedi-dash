
User wants the EditarCargaDialog (Consolidado edit dialog) wider and taller to eliminate horizontal and vertical scroll on the visible content.

Current: `max-w-lg` (~512px) and `max-h-[90vh]` with overflow scroll. The text overflows horizontally (e.g. "SALVADOR COMERCIO ATACADISTA DE AL...") and the items list has its own `max-h-[240px]` scroll.

## Plano: Aumentar diálogo de Editar Carga

### Mudanças em `src/components/dashboard/EditarCargaDialog.tsx`

1. **Largura**: trocar `max-w-lg` por `max-w-4xl` (≈896px) — cabe linhas de pedido completas sem truncar.
2. **Altura**: manter `max-h-[90vh]` (necessário em telas pequenas), mas aumentar a área da lista de pedidos de `max-h-[240px]` para `max-h-[55vh]` para reduzir necessidade de rolagem.
3. **Truncamento de texto**: remover `truncate` da linha de detalhes do pedido e permitir `whitespace-normal` — com mais largura, o texto cabe; quando ainda for longo, quebra para a linha seguinte em vez de cortar.
4. **Grid de campos**: manter `grid-cols-2` mas aproveitar melhor a largura (campos ficam mais confortáveis automaticamente).

### Visual

```text
┌─────────────────────────────── Editar Carga ─┐
│  Nome da Carga: [____________________]       │
│  Placa | Motorista | Tipo | Transportadora   │  ← 4 colunas confortáveis
│  Pedidos na carga (23)                       │
│  ┌──────────────────────────────────────┐    │
│  │ Pedido — LING SUINA ...              │    │  ← linha completa visível
│  │ MACAM ... • SALVADOR/BA • 500 kg     │    │
│  │ ...                                  │    │  ← lista mais alta
│  └──────────────────────────────────────┘    │
│  [Apagar carga]        [Cancelar] [Salvar]   │
└──────────────────────────────────────────────┘
```

### Observação opcional

Promover o grid de campos para `md:grid-cols-4` para colocar Placa, Motorista, Tipo Caminhão e Transportadora na mesma linha, aproveitando ao máximo o espaço extra.

### Arquivo

| Arquivo | Ação |
|---------|------|
| `src/components/dashboard/EditarCargaDialog.tsx` | Alterar — `max-w-4xl`, lista `max-h-[55vh]`, sem truncate, grid 4 colunas em desktop |
