
## Diagnóstico

Reproduzido o caso. Em `CarregamentoDialog.handleSubmit` (linhas 294-309), quando o usuário cria um pedido novo (sem `editing.id`):

```ts
const batchRows = finalItems.map(...);
if (batchRows.length === 1) {
  onSubmit(batchRows[0]);          // ← objeto plano (sem _batch)
} else {
  onSubmit({ _batch: batchRows }); // ← envelope { _batch: [...] }
}
```

E em `Index.tsx.handleSubmit` (linhas 236-242):

```ts
} else {
  if (Array.isArray(values._batch)) {
    batchCreateMut.mutate(values._batch, onFkError);
  } else {
    createMut.mutate(values, onFkError);   // ← cria 1
  }
}
```

**Bug 1 — Pedido com 1 produto**: o objeto enviado é `batchRows[0]`, que é `{ ...basePayload, codigo_produto, nome_produto, ... }`. Não tem `_batch`. Cai no `createMut.mutate(values, onFkError)`. **OK, só insere 1.** Sem duplicação aqui.

**Bug 2 — Pedido com 2+ produtos (causa raiz da duplicação relatada)**: o dialog envia `{ _batch: batchRows }`. **Mas `_batch` é uma propriedade dentro de um objeto que também espalha o resto do form via `basePayload`?** Não — neste caminho, é só `{ _batch: [...] }`. Cai no `batchCreateMut.mutate(values._batch)`. **OK, só insere N.** Também não duplica diretamente.

**Bug 3 (REAL) — Clonagem de pedido**: em `handleClone` (linhas 254-260), o sistema cria `{ ...items[0], id: 'clone-' + uuid, numero_pedido: null }` e abre o dialog em modo `vendas`. No `CarregamentoDialog.handleSubmit` (linha 266):

```ts
if (editing && editing.id && !editing.id.startsWith("clone-")) { ... }
else { /* path de criação acima */ }
```

Como `id` começa com `clone-`, cai no path de criação. **MAS** o `lastInitId.current = editing.id` (linha 91) faz com que `setItems` seja populado com TODOS os `cloneItems`. Aí o usuário vê N produtos na tela, salva, e o sistema insere N. **Esse é o comportamento esperado.**

**Onde está a duplicação então?** Olhando de novo: em **modo edição multi-produto** (linhas 266-293), o dialog faz:
- `updateMut.mutate(updatePayload)` — atualiza item existente  
- `batchCreateMut.mutate(_batch)` — insere extras

E o `Index.handleSubmit` (linhas 201-209) faz **a mesma coisa**:
- `updateMut.mutate(updatePayload, onFkError)`  
- `batchCreateMut.mutate(_batch, onFkError)`

**Isto é correto.** Mas… o `handleClone` define `editing` com `id` começando com `clone-` E o dialog detecta esse prefixo e vai pro path de criação enviando `{ _batch: [...] }`. Confere.

**Hipótese final — duplicação na criação simples (1 produto)**: o usuário clica "Salvar" duas vezes (double-click) ou o realtime + invalidate causa uma re-renderização que dispara o submit novamente. Falta proteção:
1. `handleSubmit` não tem guard contra double-submit (`isSubmitting`)
2. `Button` de salvar não tem `disabled={mutation.isPending}`
3. `handleDialogOpenChange(false)` é chamado **antes** da mutação terminar, mas o submit já foi disparado — se o usuário clicar 2x rápido, dispara 2 inserts

**Confirmação adicional necessária**: quero validar consultando o banco se há registros recentes com `created_at` muito próximos (mesmo `numero_pedido` + `data` + `codigo_produto` em <2s) — isso confirma double-click.

## Plano

### 1. Investigação (1 query no banco)
Listar pedidos criados nas últimas 48h com possível duplicação:
```sql
SELECT numero_pedido, data, codigo_produto, cliente,
       COUNT(*) as duplicatas,
       array_agg(id ORDER BY created_at) as ids,
       array_agg(created_at ORDER BY created_at) as timestamps
FROM carregamentos_dia
WHERE created_at > now() - interval '48 hours'
  AND numero_pedido IS NOT NULL
GROUP BY numero_pedido, data, codigo_produto, cliente
HAVING COUNT(*) > 1
ORDER BY MAX(created_at) DESC
LIMIT 50;
```

Se confirmar que existem duplicatas com `created_at` separados por <3s → **double-click é a causa**. Se separados por minutos → outro bug (revisitar).

### 2. Correção principal — anti double-submit no dialog
Em `CarregamentoDialog.tsx`:
- Adicionar prop `isSubmitting?: boolean` (vinda das mutations: `createMut.isPending || batchCreateMut.isPending || updateMut.isPending`)
- Guard interno com `useRef<boolean>(false)` que vira `true` no início do `handleSubmit` e impede re-entrada (resetado quando dialog fecha)
- Botão "Salvar" com `disabled={isSubmitting || guardRef.current}`
- Texto do botão muda para "Salvando…" durante a mutação

### 3. Reforço — fechar dialog só após sucesso
Hoje `handleDialogOpenChange(false)` é chamado imediatamente após `onSubmit(...)`. Mudar para:
- Não fechar automaticamente
- Pais (Index/Rupturas) chamam `setDialogOpen(false)` no `onSuccess` da mutation
- Alternativa minimalista: manter fechamento imediato mas adicionar guard ref + disabled no botão (suficiente para impedir 99% dos casos)

Vou pela alternativa minimalista (menos invasiva): **guard ref + disabled no botão**.

### 4. Limpeza de duplicatas existentes (opcional, on-demand)
Se a query confirmar duplicatas, oferecer SQL para deletar mantendo o mais antigo:
```sql
DELETE FROM carregamentos_dia c
USING (
  SELECT array_agg(id ORDER BY created_at)[2:] as ids_remover
  FROM carregamentos_dia
  WHERE created_at > now() - interval '48 hours'
    AND numero_pedido IS NOT NULL
  GROUP BY numero_pedido, data, codigo_produto, cliente
  HAVING COUNT(*) > 1
) dup
WHERE c.id = ANY(dup.ids_remover);
```
Aguardar aprovação explícita antes de rodar.

### Sem mudanças
- `useCarregamentos`, RLS, schema, realtime, hooks de mutation

## Arquivos
- 🔍 1 query SELECT para confirmar padrão de duplicação (timestamps próximos)
- ✏️ `src/components/dashboard/CarregamentoDialog.tsx` — guard ref anti double-submit + prop `isSubmitting` + botão "Salvar" disabled durante mutação
- ✏️ `src/pages/Index.tsx` — passar `isSubmitting={createMut.isPending || batchCreateMut.isPending || updateMut.isPending}` para o dialog
- ✏️ `src/pages/Rupturas.tsx` — mesma prop `isSubmitting`
- 🆕 (condicional, após confirmação do usuário) migration de limpeza das duplicatas detectadas
