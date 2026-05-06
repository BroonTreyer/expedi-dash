## Diagnóstico

A lentidão entre telas tem 3 causas reais:

### 1. Cada página é "lazy" (carregada só quando você clica)
Toda rota usa `lazyWithRetry` (Index, Rupturas, Clientes, etc.). Quando você muda de tela pela 1ª vez, o navegador precisa **baixar + parsear o JS daquela página** antes de mostrar qualquer coisa. Em conexões fora do escritório isso vira segundos de tela em branco com o spinner.

### 2. `useClientes` re-baixa **32 mil clientes em loop de páginas de 1.000** toda vez que você abre uma tela que usa clientes (Clientes, Rupturas, Tabela de Frete)
No `src/hooks/useClientes.ts` está marcado `refetchOnMount: "always"`. Isso anula o cache de 2 minutos: ao entrar na tela, faz ~32 round-trips ao Supabase em sequência antes de renderizar a lista.

### 3. Suspense fallback ocupa a tela inteira em branco
O componente `PageFallback` mostra só um spinner centralizado, dando a sensação de "travou".

## O que vou fazer

### Correção 1 — Pré-carregar páginas em segundo plano
Após o login, em `requestIdleCallback`, disparar o `import()` das rotas mais usadas (Index, Rupturas, Clientes, Consolidado, Logística, MeuPainel, Expedição, Portaria). O usuário não percebe — o chunk já estará pronto quando ele clicar.

### Correção 2 — Pré-carregar a página ao passar o mouse no menu
No `AppSidebar`, adicionar `onMouseEnter` em cada link que dispara o `import()` da rota correspondente. Em desktop é instantâneo; em mobile (touch), o `onTouchStart` faz a mesma coisa.

### Correção 3 — Corrigir o cache de Clientes (maior ganho)
Em `useClientes`:
- Remover `refetchOnMount: "always"`.
- Subir `staleTime` de 2min para 10min (clientes mudam pouco).
- Manter invalidação por mutation (criar/editar/excluir cliente) para garantir frescor quando algo muda.

Resultado: a 1ª visita continua igual, mas Rupturas/Clientes/Tabela de Frete abrem **instantaneamente** nas próximas trocas de tela.

### Correção 4 — Fallback menos "vazio"
Trocar o `PageFallback` por uma barra fina no topo (estilo Vercel/YouTube), mantendo o layout/sidebar visível em vez de tela em branco. Sensação de transição muito mais rápida.

## Onde vou mexer

- `src/App.tsx` — extrair os `import()` das rotas para uma função `prefetchRoute(name)`, exportar para o Sidebar; trocar `PageFallback` por barra superior.
- `src/components/AppSidebar.tsx` — adicionar `onMouseEnter` / `onTouchStart` em cada item chamando `prefetchRoute`.
- `src/hooks/useAuth.ts` (ou um efeito em `App.tsx`) — após sessão pronta, agendar `requestIdleCallback` para pré-carregar as rotas top.
- `src/hooks/useClientes.ts` — remover `refetchOnMount: "always"` e ajustar `staleTime`.

## O que NÃO vou mexer

- Banco de dados (já está tudo indexado e leve, conforme diagnóstico anterior).
- Realtime / lógica de negócio.
- Não vou eliminar o `lazy()` (não vale carregar tudo no boot — só pré-aquecer as mais usadas).
