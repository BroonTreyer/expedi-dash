## Diagnóstico

Quando o pedido do **ALCIR — JR MIX (96)** é aberto pela tela inicial via "Editar pedido completo" (28 produtos, etapa `logistica`, `Pronto para carregar`), o salvar grava **apenas a primeira linha** do grupo. Os outros 27 itens ficam com `updated_at` antigo (13:18) — só `2e7c8131` (MORTADELA MINI FRANGO 6726) foi atualizado às 16:40.

Confirmei no banco e no audit log: nenhuma das outras linhas recebeu UPDATE. A interface mostra "Salvando…" → "Salvar" e fecha (parece sucesso), mas a alteração no item editado some na próxima leitura porque o `updateMut` da primeira linha sobrescreve campos compartilhados com base no item 0, enquanto o usuário pode ter editado a linha N — o frontend trata `finalItems[0]` como "linha principal" e o resto como `_batchUpdates`.

### Causas reais

1. **`CarregamentoDialog.handleSubmit` (linhas 351–409)** assume que `finalItems[0]` é o "item principal" sempre vinculado a `editing.id`. Ao editar um grupo de 28, o `editing` recebido é `items[0]` (Index.tsx 325), mas a ordem dos `cloneItems` em tela pode ter sido alterada (ordenação/filtro), de forma que o item realmente editado pelo usuário cai na posição N>0. Esse item vai para `_batchUpdates`, mas o `updatePayload` (linha 354) reescreve o item 0 com `peso`, `quantidade`, `ruptura` e `ruptura_sinalizada` do **próprio item 0** — inalterado, no-op no banco — enquanto outros campos compartilhados (status, etapa, etc.) cascateiam por `basePayload`.

2. **`Index.handleSubmit` (linhas 222–244)** executa o fluxo `_editingGroup` na ordem: `updateMut` → `_batchUpdates` → `_batch` → `_deleteIds`. Se `updateMut` (linha principal) **passar** mas `_batchUpdates` falhar parcialmente (ex: timeout, RLS, unique violation), o erro é jogado pra cima mas como cada update do batch usa `Promise.all` com `.single()`, **uma linha que retorne 0 rows (RLS oculto)** vira `error.code = 'PGRST116'` ('JSON object requested, multiple (or no) rows returned'), o que estoura o `firstError` e aborta — mas o `updateMut` da primeira linha **já foi commitado**. Resultado: 1 linha alterada + 27 inalteradas + sem toast de erro porque o `try/catch` em `Index` re-lança e o `submitGuard` engole.

3. **Sem feedback de erro**: o `try/catch` em `CarregamentoDialog.handleSubmit` (não mostrado mas confirmei no replay — botão volta de "Salvando…" para "Salvar" e diálogo fecha) trata silenciosamente. O usuário não recebe toast de erro.

## Plano

### 1. Garantir que o `updatePayload` da linha principal use o item certo (Dialog)
Em `src/components/dashboard/CarregamentoDialog.tsx`:
- Em `editingGroup`, identificar o item cujo `originalId === editing.id` em vez de assumir `finalItems[0]`. Se o usuário reordena/filtra os itens do dialog, o "principal" tem que continuar amarrado ao ID que o `useUpdateCarregamento` vai atualizar.
- Construir `updatePayload` a partir desse item, e mandar **todos** os outros 27 para `_batchUpdates`.

### 2. Forçar update mesmo quando o frontend acha que "nada mudou" (Hook)
Em `src/hooks/useCarregamentos.ts` (`useBatchUpdateCarregamento`, linha 244):
- Trocar `.select().single()` por `.select()` (sem `.single()`). Se RLS bloqueia 1 linha o resultado é `[]`, não erro PGRST116. Validar `data?.length === 0` e logar quais IDs falharam.
- Acumular **todos** os erros (não só o primeiro) e lançar um erro consolidado com a lista de IDs que não atualizaram, para o toast informar exatamente o que falhou.

### 3. Surface de erro no dialog (Dialog)
Em `src/components/dashboard/CarregamentoDialog.tsx`:
- Envolver `await onSubmit(...)` em `try/catch` que dispara `toast.error("Falha ao salvar — N de M itens não atualizaram")` e **mantém o diálogo aberto** quando há falha parcial. Hoje o diálogo fecha mesmo quando o cascade falha.

### 4. Tornar o cascade do `Index.handleSubmit` resiliente (Page)
Em `src/pages/Index.tsx` (linhas 222–244):
- Trocar a sequência `await … await … await` por uma transação lógica: rodar `updateMut` + `batchUpdateMut` em paralelo (são updates idempotentes com IDs distintos) e só rodar `_batch`/`_deleteIds` depois. Se qualquer um falhar, mostrar quais IDs não foram persistidos e **não fechar o diálogo** (propagar o erro para `CarregamentoDialog`).

### 5. Verificar especificamente o caso JR MIX
Após o fix, abrir o pedido 96 do ALCIR (28 produtos), editar uma linha qualquer, salvar e verificar via SQL que **todas** as 28 linhas tiveram `updated_at` atualizado para o mesmo segundo, e que o audit log registra a alteração da linha realmente editada.

## Arquivos a editar

- `src/components/dashboard/CarregamentoDialog.tsx` — identificar item principal pelo `originalId` correto + try/catch com toast e bloqueio de fechamento em falha parcial
- `src/hooks/useCarregamentos.ts` — `useBatchUpdateCarregamento` sem `.single()`, erro consolidado com lista de IDs
- `src/pages/Index.tsx` — paralelizar updates do grupo e propagar falha parcial para o dialog

## Resultado esperado

- Editar qualquer linha de um grupo de 28 produtos salva todas as 28 corretamente.
- Se algo falhar (RLS, FK, unique), o usuário vê um toast vermelho com a contagem de itens não salvos e o diálogo permanece aberto para nova tentativa, em vez de fechar silenciosamente.
- O caso reportado (JR MIX / ALCIR / pedido 96) passa a salvar todos os itens em um único clique.