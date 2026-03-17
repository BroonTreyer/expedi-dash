

# Mostrar pedidos pendentes de dias anteriores no dia atual

## Problema
A query atual busca apenas `WHERE data = date_selecionada`. Pedidos de ontem que não foram finalizados (status ≠ "Carregado") ficam "presos" na data original e não aparecem no dia atual.

## Solução
Alterar a query do painel principal para, quando a data selecionada for **hoje**, também trazer pedidos de dias anteriores que ainda não foram finalizados. Pedidos finalizados ("Carregado") continuam aparecendo apenas no Consolidado da data original.

### Alteração em `src/hooks/useCarregamentos.ts`
Mudar a `queryFn` para usar lógica condicional:
- **Se `date` = hoje**: buscar `(data = hoje) OR (data < hoje AND status != 'Carregado')`
- **Se `date` ≠ hoje** (consultando histórico): manter `data = date` como está

Usar `.or()` do Supabase SDK:
```typescript
let query = supabase
  .from("carregamentos_dia")
  .select("*, vendedores(nome_vendedor)");

const today = new Date().toISOString().split("T")[0];
if (date === today) {
  query = query.or(`data.eq.${date},and(data.lt.${date},status.neq.Carregado)`);
} else {
  query = query.eq("data", date);
}
```

### Indicação visual na tabela (`src/components/dashboard/CarregamentoTable.tsx`)
- Pedidos com `data` diferente do dia selecionado recebem um badge/indicador sutil (ex: badge "D-1" ou ícone de calendário com tooltip mostrando a data original)
- Isso ajuda o operador a identificar que o pedido veio de outro dia

### Arquivos a editar
1. `src/hooks/useCarregamentos.ts` — query condicional
2. `src/components/dashboard/CarregamentoTable.tsx` — indicador visual para itens de dias anteriores

