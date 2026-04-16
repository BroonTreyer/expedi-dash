

## Plano: Exibir cidade de cada pedido no diálogo de edição de carga

### O que será feito

Adicionar a cidade (e UF) na linha de cada pedido dentro do `EditarCargaDialog`, na linha de detalhes já existente.

### Alteração

**Arquivo:** `src/components/dashboard/EditarCargaDialog.tsx` — linha 111

De:
```
{item.cliente ?? item.codigo_cliente ?? "—"} • {(item.peso ?? 0).toLocaleString("pt-BR")} kg
```

Para:
```
{item.cliente ?? item.codigo_cliente ?? "—"} • {[item.cidade, item.uf].filter(Boolean).join("/") || "—"} • {(item.peso ?? 0).toLocaleString("pt-BR")} kg
```

Isso mostrará, por exemplo: `SENDAS DISTRIBUIDORA S/A • ITAITINGA/CE • 2.500 kg`

