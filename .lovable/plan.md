## Objetivo
Permitir editar a data de qualquer adiantamento direto pela lista (não só na criação).

## Mudanças

**`src/hooks/useAdiantamentos.ts`**
- Novo hook `useAtualizarDataAdiantamento`: mutation que faz `update({ created_at })` em `adiantamentos_frete` pelo `id` e invalida `["adiantamentos_frete", ...]`.

**`src/components/logistica/AdiantamentosTab.tsx` (`AdiantamentosTable`)**
- Transformar a célula da coluna **Data** em um `Popover` com `Calendar` (mesmo padrão do "Montar Lote"):
  - Trigger: botão `ghost` mostrando `fmtDate(a.created_at)` + `CalendarIcon`.
  - Ao escolher data: preserva a hora original do `created_at` e chama a mutation.
  - Disponível em todas as abas (pendente, pago, quitado), pois a coluna Data aparece em todas.
- Toast de sucesso/erro.

## Detalhes técnicos
- `Calendar` com `className="p-3 pointer-events-auto"`, locale pt-BR no botão.
- Sem alterar `quitado_em`/`pago_em`; apenas `created_at` (que é a "Data" exibida e usada para ordenação).
- RLS já permite UPDATE para admin/logística/faturamento.