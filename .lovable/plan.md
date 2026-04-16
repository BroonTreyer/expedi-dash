

## Plano: PWA robusta para Portaria — correção de reinício na foto e atualização forçada

### Problemas identificados

1. **App reinicia ao tirar foto**: No modo PWA standalone, ao abrir a câmera nativa via `capture="environment"`, o Android pode suspender/matar a WebView. Quando o usuário volta, o Service Worker com `registerType: "autoUpdate"` detecta uma nova versão e **recarrega a página automaticamente**, perdendo todo o formulário.

2. **Atualizações não chegam**: O `autoUpdate` deveria funcionar, mas sem feedback visual o usuário não percebe que precisa reabrir o app. Também não há mecanismo para forçar a atualização.

### Solução

#### 1. Trocar para `registerType: "prompt"` com toast de atualização controlada

Em vez de recarregar automaticamente (que causa o "reinício"), o PWA vai **avisar** que há uma atualização disponível e deixar o usuário decidir quando aplicar — nunca no meio de um formulário.

**Arquivo: `vite.config.ts`**
- Mudar `registerType` de `"autoUpdate"` para `"prompt"`
- Adicionar `devOptions: { enabled: false }` para não interferir no editor
- Adicionar `skipWaiting: false` (o SW espera o usuário aceitar)
- Adicionar runtime caching para URLs do Storage (fotos)

#### 2. Criar componente de atualização PWA

**Arquivo novo: `src/components/PwaUpdatePrompt.tsx`**
- Escuta o evento `onNeedRefresh` do vite-plugin-pwa
- Exibe um toast/banner fixo: "Nova versão disponível. Atualizar agora?"
- Botão "Atualizar" chama `updateServiceWorker(true)` que faz `skipWaiting` + reload
- Botão "Depois" dispensa o toast (atualiza na próxima abertura)

#### 3. Guarda contra iframe/preview no `main.tsx`

**Arquivo: `src/main.tsx`**
- Adicionar lógica para desregistrar SWs quando rodando em iframe ou domínio de preview do Lovable
- Impede que o SW interfira no editor

#### 4. Estabilizar captura de foto no PWA

**Arquivo: `src/components/portaria/CapturaFoto.tsx`**
- O componente em si está correto (usa `<input type="file" capture>`), o problema não é nele
- O bug era causado pelo SW fazendo auto-reload — resolvido pela troca para `prompt`

#### 5. Forçar limpeza de SW antigo

**Arquivo: `vite.config.ts`** (workbox config)
- Adicionar `cleanupOutdatedCaches: true` para limpar caches de versões antigas
- Isso garante que ao instalar o novo SW, caches velhos são removidos

### Arquivos

| Arquivo | Ação |
|---------|------|
| `vite.config.ts` | Alterar — `prompt`, `devOptions`, runtime cache storage |
| `src/main.tsx` | Alterar — guard iframe/preview, unregister SWs |
| `src/components/PwaUpdatePrompt.tsx` | Criar — toast de atualização |
| `src/App.tsx` | Alterar — renderizar `PwaUpdatePrompt` |

### Resultado

- **Foto não reinicia mais**: O SW nunca faz reload automático, só quando o usuário aceita
- **Atualizações visíveis**: Toast informando "Nova versão disponível" com botão para atualizar
- **Limpeza de cache**: Caches antigos removidos automaticamente
- **Preview protegido**: SW desativado no editor Lovable

