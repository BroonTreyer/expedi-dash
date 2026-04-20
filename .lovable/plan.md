

## Diagnóstico

O agrupamento "que parece soma" está em `src/components/dashboard/CarregamentoTable.tsx`, função `buildGroups` (linhas 82-96):

```ts
function buildGroups(data: Carregamento[]): Group[] {
  const map = new Map<string, Group>();
  for (const c of data) {
    if (c.codigo_cliente) {
      const key = c.codigo_cliente;       // ← chave SÓ por cliente
      if (map.has(key)) map.get(key)!.items.push(c);
      else map.set(key, { ... items: [c] });
    } ...
  }
}
```

Quando logística cadastra um **segundo pedido para o mesmo cliente no mesmo dia** (ex: pedido 1234 e pedido 1235 do cliente 001), os dois caem no **mesmo grupo expansível** porque a chave é apenas `codigo_cliente`. Visualmente parece que "somou" — peso total no header soma os dois (`group.items.reduce((s,i) => s + (i.peso ?? 0), 0)`), e o card mostra "X itens".

Isso é **correto para múltiplos produtos do MESMO pedido** (ex: pedido 1234 com 3 produtos), mas **errado para pedidos distintos** do mesmo cliente — devem aparecer separados.

Os dados no banco estão corretos (cada linha tem seu `numero_pedido` próprio). O bug é puramente visual de agrupamento.

## Plano

### Mudança única em `src/components/dashboard/CarregamentoTable.tsx`

Trocar a chave de agrupamento de `codigo_cliente` para `codigo_cliente + numero_pedido`:

```ts
function buildGroups(data: Carregamento[]): Group[] {
  const map = new Map<string, Group>();
  const singles: Group[] = [];
  for (const c of data) {
    if (c.codigo_cliente && c.numero_pedido != null) {
      const key = `${c.codigo_cliente}__${c.numero_pedido}`;
      if (map.has(key)) map.get(key)!.items.push(c);
      else map.set(key, { codigoCliente: c.codigo_cliente, nomeCliente: c.cliente, items: [c] });
    } else {
      singles.push({ codigoCliente: c.codigo_cliente, nomeCliente: c.cliente, items: [c] });
    }
  }
  return [...map.values(), ...singles];
}
```

Comportamento resultante:
- **Pedido único do cliente** → 1 linha (igual hoje)
- **Mesmo pedido com vários produtos** → agrupa expansível (igual hoje, comportamento útil)
- **Pedidos diferentes do mesmo cliente** → linhas/cards separados (corrige o bug)
- **Pedidos sem `numero_pedido`** → cada um vira um card individual (sem agrupar por cliente)

### Ajuste cosmético no header do grupo expansível
No badge do grupo (linha 151), incluir o número do pedido para deixar claro que é UM pedido do cliente, não vários:

```tsx
<span className="text-xs font-mono font-bold text-primary">
  {group.codigoCliente} – {group.nomeCliente ?? "Sem nome"} · Pedido {group.items[0].numero_pedido}
</span>
```

E o resumo "{N} itens" passa a representar "{N} produtos do mesmo pedido" — semanticamente correto agora.

### Sem mudanças
- Backend / RLS / `useCarregamentos` / triggers
- `Consolidado.tsx` (agrupa por `carga_id`, não tem esse bug)
- `KanbanView`, `KpiCards` (já contam por `numero_pedido` único)
- Lógica de clonagem (continua passando `group.items`, agora corretamente um único pedido)

### Memória
Atualizar `mem://features/multi-product-logic` para registrar que o agrupamento visual da tabela usa **`codigo_cliente + numero_pedido`** — pedidos distintos do mesmo cliente sempre aparecem separados.

## Arquivos
- ✏️ `src/components/dashboard/CarregamentoTable.tsx` — `buildGroups` agrupa por `codigo_cliente + numero_pedido`; badge do grupo passa a mostrar "Pedido N"
- ✏️ `mem://features/multi-product-logic` — refletir nova chave de agrupamento

