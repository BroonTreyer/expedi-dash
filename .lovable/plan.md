# Destaque do campo "Data do Carregamento"

O time de Faturamento informou que esse campo é responsabilidade deles, então precisa ficar visualmente em destaque no diálogo de Fechamento de Carga (`FechamentoLoteDialog`), evitando esquecimentos.

## Mudanças (somente UI)

Arquivo: `src/components/dashboard/FechamentoLoteDialog.tsx` (campo na linha ~802-805)

1. **Promover o campo para fora do grid padrão** — renderizar "Data do Carregamento" em um bloco próprio no topo do formulário de fechamento (antes de OC / Tipo Caminhão / Motorista), ocupando largura destacada.
2. **Estilo de destaque**:
   - Card com borda `border-primary/40` e fundo `bg-primary/5`.
   - Label maior (`text-sm font-semibold`) com ícone `CalendarDays` ao lado.
   - Input `type="date"` em tamanho `h-11 text-base` (vs. os demais `h-9 text-xs`).
   - Texto auxiliar: "Preenchido pelo Faturamento — confirme a data em que a carga será efetivamente carregada."
3. **Validação visual**: quando vazio, borda em `border-destructive` + mensagem "Obrigatório" inline (a validação lógica já existe, só reforçar visualmente).
4. **Sem alterações** em hooks, estado, submit, schema ou em outros campos.

## Fora do escopo

- Nenhuma mudança em backend, RLS, migrations ou em outras telas.
- Nenhuma mudança no fluxo do timeline de distribuidores criado anteriormente.
