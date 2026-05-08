## Problema

De vez em quando a tela some e aparece "404 - Página não encontrada", mesmo estando em rotas válidas como `/expedicao`.

A causa raiz não é roteamento — é um erro JavaScript fatal que derruba o React:

```
RangeError: Maximum call stack size exceeded
  at RealtimeChannel.unsubscribe
  at RealtimeClient.removeChannel
  at src/hooks/useStatusPortariaPorCarga.ts:200
  at Channel.trigger ... onClose
```

Quando esse erro estoura, o React desmonta a árvore atual e o usuário cai em rota inexistente → renderiza `NotFound.tsx` ("404 Página não encontrada"). Não é um problema de SPA fallback nem de rota nova.

## Por que estoura a stack

Em `src/hooks/useStatusPortariaPorCarga.ts` (callback do `subscribe`, linhas 233–247):

- Quando o canal recebe `CLOSED` / `CHANNEL_ERROR` / `TIMED_OUT`, **dentro do próprio callback** chamamos `supabase.removeChannel(channel)`.
- `removeChannel` chama `unsubscribe()`, que dispara `onClose` de novo, que reentra no mesmo callback, que chama `removeChannel` de novo… recursão infinita até estourar a stack.

Além disso a Promise rejeitada vira `unhandled rejection` e mata o render em curso.

## Plano de correção

**Arquivo único:** `src/hooks/useStatusPortariaPorCarga.ts`

1. **Quebrar a recursão**: dentro do callback de `subscribe`, em vez de chamar `supabase.removeChannel(channel)` síncronamente, agendar com `setTimeout(..., 0)` para sair do stack do `onClose` antes de remover.
2. **Guardar contra reentrância**: usar uma flag local `closing` para garantir que, mesmo se o callback disparar mais de uma vez para o mesmo canal, só agendamos `removeChannel` uma vez e só agendamos um `reconnectTimer` por ciclo.
3. **Limpar referência antes de remover**: setar `channel = null` antes do `removeChannel` agendado, para que o cleanup do `useEffect` não tente remover de novo o mesmo canal.
4. **Envolver `removeChannel` em try/catch silencioso** (já existe) e capturar a Promise retornada com `.catch(() => {})` para não gerar `unhandledrejection`.
5. **Manter** o restante intacto: backoff de reconexão (3s, 6s, 12s… até 60s), debounce de 1.5s no invalidate, `enabled: !!session`, topic único por tentativa.

## Validação

- Abrir `/expedicao` e `/consolidado`, deixar a aba aberta vários minutos, forçar reconexão (alternar rede / dormir o computador) e confirmar que:
  - Não aparece mais `Maximum call stack size exceeded` no console.
  - A tela não cai mais para 404 sozinha.
  - Após reconectar, os KPIs continuam atualizando (debounce + invalidate funcionando).
- Conferir o console de erros do preview depois do fix.

## Fora do escopo

- Não mexer em rotas, `BrowserRouter`, `NotFound.tsx` nem em outros hooks de realtime — o sintoma do 404 é consequência, não causa.
