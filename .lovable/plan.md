

# Fixar cabeçalho da tabela durante scroll vertical

## Problema
O `TableHeader` já tem `sticky top-0` mas não está funcionando corretamente. O container pai da tabela (`overflow-y: visible`) permite que o sticky propague até o `main` (scroll container do Layout), porém o cabeçalho precisa de um `z-index` mais alto e fundo opaco garantido para funcionar visualmente.

## Mudança

**`src/components/dashboard/CarregamentoTable.tsx`**
- Aumentar `z-index` do `TableHeader` de `z-10` para `z-20` (evitar sobreposição com outros elementos)
- Garantir que cada `TableHead` tenha `bg-muted/40` individual (herança de background em sticky pode falhar)
- Adicionar `shadow-sm` sutil no header para criar separação visual ao rolar

Ajuste mínimo — uma linha de classe CSS no `TableHeader`.

