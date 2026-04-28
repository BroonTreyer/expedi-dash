
# Auditoria Completa do Sistema — Achados e Correções

Rodei uma varredura no banco, no código e nas políticas. Abaixo estão os problemas reais encontrados, ordenados por gravidade, com evidência numérica.

---

## 1. CRÍTICO — Duplicatas continuam sendo geradas em `etapa=logistica`

**Evidência:**
- 31 grupos duplicados / 67 linhas nos últimos 30 dias.
- 100% das duplicatas estão em `etapa=logistica`, com `numero_pedido NULL`, `operation_id NULL`, `row_op_key NULL`.
- Diferença de tempo entre as duplicatas vai de **1 minuto a 24 horas** — não é double-click, é **re-submissão deliberada de fluxos sem chave de idempotência**.
- Adoção da idempotência hoje: **0 de 651 linhas** em `etapa=logistica` têm `operation_id`. As proteções criadas só atuam em `useCreateCarregamento` e `useBatchCreateCarregamento`, mas o fluxo de logística usa **`supabase.from(...).insert(...)` direto** em vários lugares.

**Causa raiz (3 pontos no código):**
1. `src/pages/Index.tsx` linha 447 — insert direto em `veiculos_esperados` (ok), mas o **fechamento de lote** (`handleLoteSubmit`) atualiza `carregamentos_dia` via `batchUpdateMut` sem proteção contra reentrada quando o usuário aperta "Fechar Carga" duas vezes rápido.
2. `CarregamentoDialog.tsx` linha 314 (`batchInserts.push(row)`) — quando faturamento edita um pedido em modo "grupo" e a primeira tentativa falha por rede mas a linha foi gravada, a segunda tentativa **insere de novo sem `row_op_key`** porque o caminho `batchInserts` não passa por `useBatchCreateCarregamento` — vai pelo `_batch` no `handleSubmit` (linha 239), que de fato chama o hook protegido. Confirmado: o hook gera `operation_id`, mas a chave é **gerada por tentativa**, então cada retry produz uma chave nova → não bloqueia nada.
3. **Cascata de irmãos** (`Index.tsx` linhas 269-291): o matching de irmãos usa `numero_pedido`, mas **99,3% das linhas (1.092 de 1.099) não têm `numero_pedido`** em logística. Resultado: a cascata silenciosamente nunca encontra irmãos e não causa o bug, mas o sistema de pedidos está cego.

**Correção:**
- Mover geração de `operation_id`/`row_op_key` para o **chamador** (não para o hook), usando o `id` da operação em curso (ex.: `editing.id` + hash dos campos). Assim retries usam a mesma chave e o índice unique bloqueia.
- Criar `numero_pedido` automaticamente em todo INSERT via trigger DB (`next_numero_pedido` já existe — usar como `DEFAULT` ou via trigger BEFORE INSERT). Resolve cascata, dedup e rastreabilidade.
- Adicionar `submitGuard` (já existe em `CarregamentoDialog`) também no `FechamentoLoteDialog` e `EditarCargaDialog`.
- Limpar as 67 linhas duplicadas atuais (manter a mais antiga de cada grupo).

---

## 2. CRÍTICO — `numero_pedido` ausente em 99% das linhas

**Evidência:**
| Etapa | Total | Sem numero_pedido |
|-------|-------|-------------------|
| logistica | 651 | 647 (99,4%) |
| vendas | 117 | 117 (100%) |
| rascunho | 1 | 0 |

**Impactos:**
- Cascata de edição de pedido (Index.tsx:269) **nunca dispara** → editar um produto não propaga cliente/carga para os irmãos.
- Função RPC `next_numero_pedido(date)` existe mas **nunca é chamada**.
- Agrupamento "pedido completo" no UI agrupa por timestamp, instável.

**Correção:** trigger `BEFORE INSERT` em `carregamentos_dia` que preenche `numero_pedido := next_numero_pedido(NEW.data)` quando NULL.

---

## 3. ALTO — Cargas órfãs (sem veículo esperado)

**Evidência:** 25 cargas com `etapa <> 'vendas'` e `carga_id` preenchido, mas **sem nenhum registro em `veiculos_esperados`** nos últimos 30 dias.

**Causa:** o trigger `on_carga_fechada` cria veículo esperado **só quando `placa IS NOT NULL`** no momento do fechamento. Se a carga é fechada sem placa (lote/roteirização) e a placa é preenchida depois, a portaria nunca recebe o veículo esperado.

**Correção:** criar um trigger `AFTER UPDATE` que detecta `placa IS NULL → NOT NULL` em linhas de etapa logística e cria/vincula o veículo esperado.

---

## 4. ALTO — Inconsistências de ruptura e peso

**Evidência:**
- 46 linhas com `ruptura=true` mas **sem `motivo_ruptura`**.
- 34 linhas com `peso > peso_original` (impossível por regra de negócio — ruptura só reduz).
- `ruptura_sinalizada` está OK (0 inconsistentes).

**Correção:**
- Validação no `CarregamentoDialog`: `motivo_ruptura` obrigatório quando `ruptura=true`.
- Trigger `BEFORE UPDATE` que rejeita `peso > peso_original` (ou usa `LEAST`).

---

## 5. MÉDIO — 38 funções `SECURITY DEFINER` executáveis por anônimos/autenticados

**Evidência:** linter reporta 38 warnings de funções `SECURITY DEFINER` no schema `public` callable sem grants restritos. Inclui `has_role`, `notify_role`, `get_my_vendedor_id`, etc.

**Risco real:** baixo (a maioria valida `auth.uid()` internamente), mas `notify_role` e `log_audit` **podem ser chamadas por qualquer authenticated user via PostgREST RPC** e gravar lixo nas tabelas de notificação/auditoria.

**Correção:** `REVOKE EXECUTE ... FROM anon, authenticated` em `notify_role`, `log_audit`, `sync_clients_to_orders`. Manter apenas `has_role`, `get_my_vendedor_id`, `get_portal_data_public`, `get_portal_token_public`, `next_numero_pedido` acessíveis.

---

## 6. MÉDIO — Optimistic update sem rollback completo no `useUpdateCarregamento`

**Arquivo:** `src/hooks/useCarregamentos.ts:286-325`. O `onSettled` está vazio confiando no realtime — se o realtime estiver desconectado (status disconnected), o cache pode ficar com dado errado por minutos. A cascata de irmãos no `Index.tsx:288` faz `.catch(() => {})` — engole erro silenciosamente.

**Correção:** invalidar query no `onSettled` com `refetchType: 'none'` (atualização passiva), e remover o `.catch(() => {})` da cascata para mostrar toast.

---

## Diagrama do bug de duplicação

```text
Usuário (Faturamento)
   │
   │ Edita pedido com 3 produtos
   ▼
CarregamentoDialog.handleSubmit
   │
   ├─► UPDATE produto 1 (id existente)        ─ ok, idempotente
   │
   ├─► _batchUpdates: [produto 2 (id)]        ─ ok via batchUpdateMut
   │
   └─► _batch: [produto 3 (sem id)]           ◄── INSERT
                  │
                  ▼
       useBatchCreateCarregamento gera NOVO operation_id
                  │
       Se rede falha + retry do React Query:
                  ▼
       NOVO operation_id de novo → unique não bloqueia
                  │
                  ▼
       2 linhas iguais no banco
```

A **fix correta** é gerar `row_op_key` **determinístico** baseado em `(editing.id, codigo_produto, índice)` no momento em que o dialog monta o payload, ANTES do hook.

---

## Plano de execução (priorizado)

### Fase 1 — Parar a sangria (migração + 2 arquivos)
1. **Migração SQL:**
   - Trigger `BEFORE INSERT` para preencher `numero_pedido` automaticamente.
   - Trigger `BEFORE UPDATE` que impede `peso > peso_original`.
   - Trigger `AFTER UPDATE` para vincular veículo esperado quando placa é preenchida tardiamente.
   - `REVOKE EXECUTE` em `notify_role`, `log_audit`, `sync_clients_to_orders` de `anon, authenticated`.
   - Limpeza: `DELETE` das 67 linhas duplicadas mantendo a mais antiga de cada grupo `(codigo_produto, numero_pedido, cliente, data)`.

2. **`src/components/dashboard/CarregamentoDialog.tsx`:** gerar `operation_id` (uma vez por abertura do dialog) e `row_op_key` determinístico (`${operation_id}__${codigo_produto}__${index}`) **dentro do dialog**, passar nos payloads. Isso garante que retries do React Query reusam a mesma chave.

3. **`src/components/dashboard/FechamentoLoteDialog.tsx`:** adicionar `submitGuard` ref para bloquear duplo-clique no botão "Fechar Carga".

### Fase 2 — Validações
4. **`CarregamentoDialog`**: `motivo_ruptura` obrigatório quando `ruptura=true` (validação no submit + asterisco no label).
5. **`useUpdateCarregamento`**: trocar `onSettled` vazio por `qc.invalidateQueries({ ..., refetchType: 'none' })`.
6. **`Index.tsx:288`**: remover `.catch(() => {})` da cascata de irmãos.

### Fase 3 — Verificação
7. Rodar query de auditoria pós-deploy para confirmar duplicatas = 0 e adoção de `operation_id` = 100%.

---

## Detalhes técnicos

**Arquivos a editar:**
- `src/components/dashboard/CarregamentoDialog.tsx` (gerar chave determinística)
- `src/components/dashboard/FechamentoLoteDialog.tsx` (submit guard)
- `src/hooks/useCarregamentos.ts` (remover geração de chave do hook; aceitar a do chamador; melhorar onSettled)
- `src/pages/Index.tsx` (remover catch silencioso)
- 1 nova migração SQL com 4 triggers + 1 REVOKE + 1 DELETE de cleanup

**Não vai mexer:** RLS de tabelas, fluxo do vendedor (já idempotente), portaria, edge functions.

---

## Pergunta antes de executar

Posso prosseguir com **as 3 fases de uma vez**, ou você prefere que eu pare entre cada fase para você validar? E confirma o **DELETE das 67 linhas duplicadas legacy** (mantendo a mais antiga de cada grupo)?
