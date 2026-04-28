# Auditoria: Duplicação/Triplicação ao editar pedidos

## Resumo dos problemas encontrados

Fiz um rastreamento completo de todos os pontos do código que escrevem em `carregamentos_dia` ao editar um pedido. Identifiquei **3 causas reais** de duplicação/triplicação, mais 1 risco de race condition. Eles se combinam — por isso às vezes duplica, às vezes triplica.

---

## Causa #1 — Edição do vendedor: estratégia "DELETE + INSERT" sem transação (CRÍTICO)

**Arquivo:** `src/components/vendedor/MeusPedidos.tsx`, linhas 60-87 (`handleSubmit` no modo edição).

Hoje, ao editar um rascunho, o código faz:

```text
1. SELECT irmãos do mesmo (data + numero_pedido + codigo_cliente)
2. DELETE in (ids antigos)
3. INSERT (todos os itens novos)
```

Problemas:

- Se o usuário **clicar duas vezes em "Salvar"** (mobile é muito comum) antes do primeiro request voltar, o segundo clique pega a mesma lista `meusPedidos` (já cacheada) e roda `DELETE + INSERT` **de novo**. Como o primeiro DELETE já apagou os irmãos, o segundo DELETE não acha nada — mas o **INSERT roda mesmo assim** → resultado: 2x os itens. Triplica se clicar 3x.
- Não há `setSubmitting(true)` antes do `await` no handler do dialog em si — o botão tem `disabled={isSubmitting}`, mas a `useState` só atualiza no próximo tick. Em conexão lenta dá pra disparar.
- Se o INSERT falhar no meio, perde os itens originais (sem rollback).

## Causa #2 — Edição em Aprovações: identidade do grupo frágil para "novos itens" (CRÍTICO)

**Arquivo:** `src/hooks/useEditarPedidoAprovacao.ts`.

A lógica está correta em teoria (UPDATE existentes + INSERT novos + DELETE removidos), **mas** os "novos itens" são identificados apenas por `!i.id` no estado React. Ao salvar:

- Se o usuário clicar **"Salvar e aprovar"** e o request demorar, e ele clicar de novo, o segundo submit ainda enxerga os mesmos itens novos (sem `id` atribuído) e roda outro `INSERT`. Resultado: novos itens duplicados/triplicados.
- O `mutationFn` não verifica `isPending` internamente; o botão tem `disabled={editar.isPending}` mas isso depende do React commitar antes do próximo clique.
- Não há **idempotência no servidor** (sem `operation_id` na tabela, sem `upsert` com `onConflict`).

## Causa #3 — Realtime + cache otimista geram "fantasma" temporário

**Arquivos:** `src/hooks/useCarregamentos.ts` (subscribe INSERT linha 61), `src/pages/Consolidado.tsx` (linha 80).

Sequência observada:

```text
1. UPDATE otimista do hook (item já aparece atualizado na UI)
2. INSERT novos chega via realtime → adiciona na lista
3. invalidateQueries dispara refetch → re-baixa tudo
4. Durante esse intervalo, o usuário vê itens "duplicados" porque
   o refetch pode trazer linhas que já estavam no cache otimista
   sem deduplicação por id
```

Não é duplicação no banco, mas o usuário **vê** duplicação na tela e às vezes clica de novo achando que falhou — o que dispara a Causa #1 ou #2 e aí **vira duplicação real**.

## Causa #4 — `next_numero_pedido` chamado fora de transação no INSERT do vendedor

**Arquivo:** `src/components/vendedor/MeusPedidos.tsx`, linhas 89-94.

No fluxo de **criar** (não editar), faz `rpc("next_numero_pedido")` e depois `INSERT`. Em duplo clique, dois RPCs sequenciais geram **dois números diferentes** com os mesmos itens → o sistema **não os agrupa** (vira 2 pedidos distintos com mesmo cliente/produtos), o que aparece como "duplicado" na tela de Aprovações.

---

## Plano de correção

### 1. Proteção universal contra duplo clique (todos os submits)

- Adicionar `useRef<boolean>` "submittingRef" em `MeusPedidos.handleSubmit`, `EditarPedidoAprovacaoDialog.salvar` e `NovoPedidoDialog.submit`. Bloquear reentrada **antes** do `await`, liberar no `finally`.
- Garante que mesmo cliques rápidos antes do React re-renderizar não disparem 2 mutations.

### 2. Trocar "DELETE + INSERT" por **UPDATE/INSERT/DELETE delta** no vendedor

Refatorar `MeusPedidos.tsx → handleSubmit` (modo edição) para usar a mesma estratégia de delta que já existe em `useEditarPedidoAprovacao.ts`:

- Comparar itens novos × irmãos atuais por `id`.
- `UPDATE` os que mantêm `id`, `INSERT` os sem `id`, `DELETE` os removidos.
- Elimina o "INSERT em cima de DELETE já consumido" que é a raiz da duplicação.

### 3. Idempotência server-side com `operation_id`

- Adicionar coluna `operation_id uuid` em `carregamentos_dia` (nullable) + índice único parcial `WHERE operation_id IS NOT NULL`.
- Cada submit (cliente) gera um único UUID `crypto.randomUUID()` e envia em **todos** os INSERTs daquela operação.
- Se o usuário "duplo-clicar" e o segundo request chegar, o `INSERT` rejeita por unique violation. O cliente trata o 23505 silenciosamente.
- Migration via tool de migração; safe pois é coluna nullable e índice parcial.

### 4. Travar `next_numero_pedido` no fluxo de criação

- Mover o `rpc("next_numero_pedido")` + `INSERT` para uma **edge function** transacional (`criar-pedido-vendedor`), assim o número é alocado e o INSERT acontece atomicamente. Duplo clique na pior das hipóteses devolve o mesmo `numero_pedido` se usar idempotência por `operation_id`.
- Alternativa mais leve (se preferir não criar edge function agora): apenas implementar #1 + #3 já elimina o sintoma; o #4 fica como melhoria.

### 5. Deduplicação defensiva no realtime/cache

- Em `useCarregamentos.ts`, ao receber `INSERT` via realtime e ao mesclar `setQueriesData`, deduplicar por `id` (`Map(items.map(i => [i.id, i]))`) antes de retornar a lista. Idem no `Consolidado.tsx`.
- Garante que o usuário **nunca veja** duplicado na UI mesmo durante refetch — corta o feedback ruim que faz ele clicar de novo.

### 6. Limpeza de duplicatas existentes (opcional)

Se você confirmar que já tem duplicatas no banco, eu posso rodar uma query SELECT de auditoria pra mostrar quantas são, agrupadas por `(vendedor_id, data, numero_pedido, codigo_cliente, codigo_produto)`. Não vou apagar nada sem você ver e confirmar.

---

## Arquivos que serão alterados

- `src/components/vendedor/MeusPedidos.tsx` — refatorar `handleSubmit` para delta + ref de bloqueio
- `src/components/vendedor/NovoPedidoDialog.tsx` — ref de bloqueio + propagar `operation_id`
- `src/hooks/useEditarPedidoAprovacao.ts` — adicionar `operation_id` em todos os INSERTs, tratar 23505
- `src/hooks/useCarregamentos.ts` — dedup por id no merge do realtime
- `src/pages/Consolidado.tsx` — dedup por id no merge do realtime
- **Migration nova:** adicionar coluna `operation_id` + índice único parcial em `carregamentos_dia`
- (Opcional) `supabase/functions/criar-pedido-vendedor/index.ts` — alocação atômica do `numero_pedido`

## Ordem de implementação proposta

1. Migration `operation_id` (base para tudo) + dedup defensivo no cache (ganho imediato)
2. Refatorar edição do vendedor (Causa #1 — a mais grave hoje)
3. Idempotência no `useEditarPedidoAprovacao` (Causa #2)
4. (Opcional, depois) Edge function para `next_numero_pedido` atômico

Após aprovação eu executo na ordem acima e te aviso a cada etapa.