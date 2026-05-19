## Objetivo

Permitir informar a **data da quitação** ao registrar baixa (padrão = hoje, editável) e **exibir essa data** na aba **Quitados** de Logística → Adiantamentos.

## Mudanças

### 1. `src/components/logistica/RegistrarQuitacaoDialog.tsx`
- Adicionar campo `dataQuitacao: Date` (default `new Date()`), usando o Shadcn DatePicker (Popover + Calendar).
- Mostrar o campo logo acima de Observações: "Data da quitação".
- Ao confirmar, converter para ISO `yyyy-MM-ddTHH:mm:ssZ` mantendo a hora atual (para preservar precisão), e passar via `quitado_em` para o hook.

### 2. `src/hooks/useAdiantamentos.ts` — `useRegistrarQuitacao`
- Aceitar `quitado_em?: string` no input.
- Se vier, usa esse valor; senão, cai no `new Date().toISOString()` atual.

### 3. `src/components/logistica/AdiantamentosTab.tsx` — aba **Quitados**
- Adicionar coluna **"Quitado em"** no `ListaAdiantamentos`, exibindo `fmtDate(a.quitado_em)` (formato pt-BR).
- A coluna fica visível em todas as abas (pendentes/pagos a aparece como "—" naturalmente), ou condicional só para Quitados — vou deixar **sempre visível** para consistência da tabela.

## Não muda
- Esquema do banco (coluna `quitado_em timestamptz` já existe).
- RLS, lógica de quitação parcial, comprovantes.

## Resultado
- Dialog de quitação mostra um seletor de data preenchido com hoje; usuário pode escolher outra data antes de confirmar.
- Aba "Quitados" passa a mostrar a data informada (manual ou automática) em formato dd/MM/aaaa.
