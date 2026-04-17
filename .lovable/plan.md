
## Diagnóstico

User reporta que o PWA não atualizou após mudanças recentes. Hoje a config (`vite.config.ts`) usa:
- `registerType: "prompt"` + `PwaUpdatePrompt.tsx` que mostra toast "Nova versão disponível" via `useRegisterSW`
- `skipWaiting: false` e `clientsClaim: false` → SW novo fica em "waiting" até user clicar Atualizar

Provável motivo de não estar atualizando:
1. User não vê/ignora o toast e continua com versão antiga em cache
2. `index.html` pode estar sendo cacheado pelo SW (NetworkFirst no Supabase, mas navigateFallback usa `index.html` precacheado)
3. Sem checagem agressiva de update no foco da janela / on visibility change — só a cada 30 min

## Plano

### 1. Mudar para autoUpdate silencioso
Trocar `registerType: "prompt"` → `"autoUpdate"` em `vite.config.ts`. Setar `skipWaiting: true` + `clientsClaim: true` no workbox. Resultado: assim que a build nova é detectada, o SW substitui imediatamente e o conteúdo atualiza no próximo reload de aba — sem depender de clique do user.

### 2. Forçar checagem de update mais frequente
Atualizar `PwaUpdatePrompt.tsx`:
- Reduzir intervalo de `30 min` → `5 min`
- Adicionar `registration.update()` em `visibilitychange` (quando user volta para a aba) e em `focus`
- Como agora é autoUpdate, o toast vira informativo opcional ("Atualizado para nova versão") em vez de exigir clique — ou removemos o prompt e deixamos só silencioso. Vou manter um toast curto de confirmação pós-update.

### 3. Bump de versão para invalidar cache atual
Como users já têm o SW antigo instalado com `skipWaiting:false`, eles precisam recarregar uma vez para pegar o novo SW. O novo SW (autoUpdate) garante que daí em diante seja automático. Não há código a mudar para isso — só a build nova já resolve.

### 4. Sem mudanças
- Manifest, ícones, runtimeCaching de Supabase, guards de iframe/preview em `main.tsx`.
- `navigateFallbackDenylist` continua com `/~oauth`.

## Arquivos
- ✏️ `vite.config.ts` — `registerType: "autoUpdate"`, `skipWaiting: true`, `clientsClaim: true`
- ✏️ `src/components/PwaUpdatePrompt.tsx` — intervalo 5 min + update em `visibilitychange`/`focus`, toast informativo curto

## Observação
Após o deploy desta mudança, **o primeiro reload** ainda vai usar o SW antigo (modo prompt). A partir do segundo reload, todas as atualizações futuras serão automáticas e silenciosas. Em produção (`fricotrack.com.br` / `expedi-dash.lovable.app`) basta publicar e abrir o app duas vezes.
