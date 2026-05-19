## Objetivo
Permitir escolher a data ao gerar o(s) adiantamento(s) na aba **Montar Lote** — igual ao que já existe no diálogo de Quitação. Hoje a data é sempre `now()`.

## Onde mexer

1. **`src/components/logistica/AdiantamentosTab.tsx`** (painel "Montar Lote")
   - Adicionar um estado `dataAdiantamento: Date` (default = hoje).
   - Logo acima do campo "Observações" / botão "Gerar Adiantamento", inserir um `Popover + Calendar` com label **"Data do adiantamento"** (mesmo padrão visual do `RegistrarQuitacaoDialog`).
   - Em `handleGerar`, montar `created_at` preservando a hora atual mas com a data escolhida (mesma lógica do diálogo de quitação) e passar para `criar.mutateAsync`.
   - Após sucesso, resetar para `new Date()`.

2. **`src/hooks/useAdiantamentos.ts`** (`useCriarAdiantamento`)
   - Aceitar `created_at?: string` no input.
   - Quando informado, incluir no `insert(...)` em `adiantamentos_frete` (a coluna `created_at` já existe e é gravável).

## Resultado
Ao clicar em "Gerar Adiantamento" / "Gerar N adiantamentos", o usuário escolhe a data antes — útil para registros retroativos. A listagem (ordenada por `created_at`) refletirá a data escolhida.