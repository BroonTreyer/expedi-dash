
User wants a button to invert (reverse) the delivery order (`ordem_entrega`) of items in a load. Context: Consolidado page, EditarCargaDialog. Items have `ordem_entrega` field set during routing.

## Plano: Botão "Inverter ordem de entrega"

### O que será feito

Adicionar botão "Inverter ordem" no diálogo `EditarCargaDialog` que reverte a sequência de entrega de todos os pedidos da carga.

### Comportamento

- Botão **"Inverter ordem"** (variant outline, ícone `ArrowUpDown`) no rodapé, ao lado de "Apagar carga"
- Ao clicar: agrupa os itens por `ordem_entrega` (pedidos com mesmo nº de parada permanecem juntos), inverte a sequência das paradas e reatribui `ordem_entrega` 1..N
- Items sem `ordem_entrega` (null) permanecem sem ordem
- Atualização em batch via `useBatchUpdateCarregamento` já existente
- Toast: "Ordem de entrega invertida"
- Não fecha o diálogo (usuário pode continuar editando)

### Lógica

```ts
// Agrupar por ordem atual (paradas únicas)
const paradas = [...new Set(items.map(i => i.ordem_entrega).filter(Boolean))].sort((a,b)=>a-b);
// Mapa: ordem antiga → ordem nova invertida
const map = new Map(paradas.map((ord, idx) => [ord, paradas[paradas.length - 1 - idx]]));
// Atualizar cada item
const updates = items
  .filter(i => i.ordem_entrega != null)
  .map(i => ({ id: i.id, ordem_entrega: map.get(i.ordem_entrega) }));
```

### Visual do rodapé

```text
[Apagar carga] [Inverter ordem]      [Cancelar] [Salvar]
```

### Arquivos

| Arquivo | Ação |
|---------|------|
| `src/components/dashboard/EditarCargaDialog.tsx` | Alterar — adicionar prop `onInverterOrdem`, botão e estado `inverting` |
| `src/pages/Consolidado.tsx` | Alterar — passar handler que usa `useBatchUpdateCarregamento` para reverter `ordem_entrega` |
