## Diagnóstico

O erro `duplicate key value violates unique constraint "carregamentos_dia_row_op_key_unique"` está sendo disparado quando você cria/edita um pedido no `CarregamentoDialog`.

### Causa raiz

Em `src/components/dashboard/CarregamentoDialog.tsx` (linha 298–299), a função `makeRowKey` gera a chave de idempotência assim:

```ts
const makeRowKey = (item, idx) =>
  `${opId}__${item.codigo_produto || "x"}__${idx}`;
```

E o `opId` (linha 84/294) é mantido em um `useRef` que **só é limpo quando o modal é fechado** (linha 92). Ou seja, o mesmo `opId` é reusado em todas as tentativas de submit dentro da mesma sessão do modal.

Isso é correto para impedir duplicatas em retry, **mas quebra em dois cenários reais**:

1. **Adicionar produto, salvar com erro, corrigir e salvar de novo** — o segundo save reusa o mesmo `opId` + mesmo `codigo_produto` + mesmo índice, e o banco bloqueia (mesmo que a primeira tentativa também tenha gravado).

2. **Editar grupo de pedidos**: ao adicionar uma nova linha, a chave fica `${opId}__${codigo_produto}__${i+1}`. Se o usuário adicionar **dois produtos com o mesmo código** (ex: o mesmo SKU em quantidades diferentes) — algo que acontece quando o pedido tem o mesmo item duplicado — `i+1` diferencia, ok. Mas no **fluxo de criação** (linha 384) usa `makeRowKey(item, i)` com `i` começando em 0, e no fluxo "extra rows" da edição (linha 368) usa `i+1`. Se o usuário re-tentar após uma falha parcial onde a primeira linha já entrou, a colisão é certa.

3. **Casos com `codigo_produto` vazio/null**: o fallback `"x"` faz com que duas linhas sem código colidam pelo mesmo prefixo `opId__x__idx` se o índice coincidir entre tentativas.

O caso mais comum que você está vendo agora (erro recorrente após tentar salvar) é o **#1**: o usuário fecha um toast de erro, ajusta algo e salva de novo — o `opIdRef` ainda está vivo, e o banco já tem alguma linha com aquela `row_op_key`.

## Correção

Tornar a chave de idempotência **mais robusta** sem perder a proteção contra duplo-clique/retry de rede.

### Mudanças em `src/components/dashboard/CarregamentoDialog.tsx`

1. **Resetar `opIdRef` após erro de submit** (não só ao fechar o modal). No bloco `finally` (linha ~393-403), quando `didSucceed` for `false`, gerar um **novo `opId`** para a próxima tentativa. Assim:
   - Duplo-clique no mesmo botão: ainda protegido (o `opIdRef` só muda depois do submit terminar).
   - Re-submit após erro corrigido: nova chave, sem colisão.

2. **Incluir um sufixo aleatório curto** dentro do `makeRowKey`, gerado uma vez por tentativa de submit (não por linha):

```ts
const attemptSuffix = (globalThis.crypto?.randomUUID?.() ?? Date.now().toString()).slice(0, 8);
const makeRowKey = (item, idx) =>
  `${opId}__${attemptSuffix}__${item.codigo_produto || "x"}__${idx}`;
```

   - Isso garante que cada **tentativa** de submit produz chaves distintas, mesmo se o `opId` fosse reusado por engano.
   - Para manter a proteção contra duplo-clique, o `attemptSuffix` é gerado **fora** do `makeRowKey`, dentro do `handleSubmit`, e só é regenerado em uma nova chamada de `handleSubmit` (que já está protegida pelo `submitGuard.current`).

3. **Tratar 23505 com mensagem amigável** já está feito nos hooks `useCreateCarregamento` / `useBatchCreateCarregamento` (retornam silenciosamente). Mas no fluxo de update + batch insert dentro do `useUpdateCarregamento`/handler do dialog, o erro 23505 está vazando como toast bruto. Vou garantir que o handler de submit principal também trate `23505` como sucesso silencioso (idempotência).

### Mudança técnica resumida

```ts
// Dentro de handleSubmit, antes do switch de modos:
if (!opIdRef.current) {
  opIdRef.current = crypto.randomUUID();
}
const opId = opIdRef.current;
const attemptSuffix = crypto.randomUUID().slice(0, 8);  // NOVO: muda a cada tentativa
const makeRowKey = (item, idx) =>
  `${opId}__${attemptSuffix}__${item.codigo_produto || "x"}__${idx}`;

// No finally, quando falhou:
} else {
  submitGuard.current = false;
  opIdRef.current = null;  // NOVO: força nova chave na próxima tentativa
}
```

## Arquivos alterados

- `src/components/dashboard/CarregamentoDialog.tsx` — única mudança (~6 linhas).

## O que NÃO muda

- Banco de dados / migrations / RLS — sem mudança.
- Outros hooks (`useCarregamentos`, `useEditarPedidoAprovacao`, `MeusPedidos`) — esses já usam um `opId` novo a cada chamada de mutation, então não sofrem desse problema.
- A proteção contra duplo-clique continua intacta (via `submitGuard.current`).

Quer que eu aplique?