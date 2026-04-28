# Correção: Preview travado em versão antiga e tela branca

## Diagnóstico

A causa raiz é a configuração do **Service Worker (PWA)** combinada com o cache do `NetworkFirst` do Supabase. Encontrei 3 problemas:

### 1. Detecção de preview incompleta (`src/main.tsx`)
A guarda atual checa apenas `id-preview--` e `lovableproject.com`, mas o domínio real do preview é `lovable.app` (ex: `id-preview--xxx.lovable.app`). Resultado: o Service Worker **se registra dentro do iframe do editor** e segura versões antigas.

### 2. Cache agressivo da API Supabase
O `runtimeCaching` usa `NetworkFirst` com `maxAgeSeconds: 300` (5 min) na API REST do Supabase. Quando você fica algum tempo sem mexer e a aba fica em background, o SW serve respostas em cache até você "cutucar" o app — daí a sensação de "preciso mandar mensagem pra atualizar".

### 3. Tela branca após deploy
Quando uma nova versão é publicada, o `index.html` antigo (em cache) referencia chunks JS com hashes que **não existem mais** no servidor → import falha → tela branca. O `cleanupOutdatedCaches: true` só age **depois** que o novo SW assume.

---

## Plano de correção

### Passo 1 — Reforçar guarda anti-iframe e domínios Lovable
Em `src/main.tsx`, ampliar a detecção de preview e **desregistrar SW + limpar caches** antes de qualquer coisa renderizar:

- Incluir `lovable.app`, `lovable.dev`, `id-preview--`, `lovableproject.com`
- Detectar iframe (já feito) — mantém
- Limpar `caches.keys()` além de desregistrar SWs
- Bloquear o registro novo (não deixar `vite-plugin-pwa` registrar de novo nesses contextos)

### Passo 2 — Desligar cache de API Supabase no SW
Remover o bloco `runtimeCaching` da API REST (`/rest/.*`). Dados operacionais (carregamentos, pedidos, portaria) **nunca** devem vir de cache — sempre do servidor. Manter apenas o cache de Storage (imagens/fotos) que é seguro.

### Passo 3 — Recuperação automática de tela branca (chunk loading errors)
Adicionar handler global em `src/main.tsx` para detectar `ChunkLoadError` / `Failed to fetch dynamically imported module` e fazer:
1. Limpar todos os caches
2. Desregistrar SWs
3. `window.location.reload()` automático (apenas 1 vez, com flag em `sessionStorage` para evitar loop)

Isso ataca direto a causa da tela branca após você ficar com a aba aberta enquanto eu publico nova versão.

### Passo 4 — Aumentar agressividade da checagem de updates
Em `src/components/PwaUpdatePrompt.tsx`:
- Reduzir intervalo periódico de 5 min → 60 segundos
- Já checa em `focus` e `visibilitychange` (ok, manter)
- Quando detectar update pronto, em vez de só mostrar toast, **forçar reload** após 1.5s (a versão nova já está ativa via `skipWaiting + clientsClaim`, mas a página atual ainda roda o JS antigo)

### Passo 5 — Limpeza única para usuários afetados
Adicionar bloco em `main.tsx` que, na primeira visita após esta correção (controlado por flag em `localStorage` tipo `sw-cleanup-v2`), limpa **todos** os caches e SWs antigos. Isso garante que quem já está com o cache "ruim" se recupere sem precisar fazer Ctrl+Shift+R manualmente.

---

## Arquivos a editar

- `src/main.tsx` — guardas, recuperação automática, limpeza única
- `vite.config.ts` — remover `runtimeCaching` da API Supabase
- `src/components/PwaUpdatePrompt.tsx` — checagem mais frequente + reload forçado

## O que esperar depois

- ✅ Editor (`*.lovable.app` em iframe) **nunca mais** registra SW → preview sempre fresco
- ✅ Em produção (`fricotrack.com.br` / `expedi-dash.lovable.app`), a app detecta updates em até 60s e recarrega sozinha
- ✅ Tela branca por chunk antigo → recuperação automática em 1 reload silencioso
- ✅ Dados do Supabase sempre do servidor (zero risco de ver pedido desatualizado)

## Observação importante
Após aplicar, **na primeira vez** ainda pode ser necessário 1 refresh manual (Ctrl+Shift+R) na sua aba atual para destravar o SW antigo que já está rodando aí. Depois disso, nunca mais.