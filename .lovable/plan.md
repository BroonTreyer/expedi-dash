
# Plano — Tornar a Expedição (e demais painéis) mais robusta

## Problema observado

Hoje, se **um** bloco/hook quebra (erro de rede, dado inesperado, RLS, undefined), a falha **propaga e derruba o painel inteiro**. Causas principais identificadas:

1. **Não existe nenhum `ErrorBoundary` no projeto** (nem global nem por bloco). Qualquer `throw` no render de um filho mata a página toda.
2. **Hooks compartilhados** (`useCargasDiaExpedicao`, `useStatusPortariaPorCarga`, `usePesoPorCarga`, `useMovimentacoes`, `useVeiculosEsperados`) lançam `throw error` em falha — sem fallback. O `Expedicao.tsx` deriva os blocos uns dos outros via `useMemo`, então uma query que quebra invalida cascata: KPIs, "A Chegar", "Cargas Expedidas" e "No Pátio" somem juntos.
3. **Warnings de `forwardRef`** no console em `PainelAChegar` e `PainelCargasFechadas` — algo (provavelmente uma `Tooltip`/`asChild`) está passando `ref` a componentes que não usam `forwardRef`. Em React 18 vira warning, em produção pode evoluir para erro silencioso.
4. **Realtime sem reconexão**: hoje os canais Supabase não tratam estado `CHANNEL_ERROR`/`CLOSED` — o painel "congela" sem o usuário perceber.
5. **Renders concorrentes** sem `staleTime`/`gcTime` consistentes em algumas queries → spinners piscando e "blocos sumindo" momentaneamente.

## Objetivo

Cada bloco da Expedição (e dos demais dashboards principais) deve **falhar de forma isolada**: se uma query der erro, só aquele card mostra "Não foi possível carregar — tentar novamente" e os outros continuam funcionando.

## O que será implementado

### 1. ErrorBoundary genérico e reutilizável
Criar `src/components/ErrorBoundary.tsx` com:
- Classe React com `componentDidCatch` que loga o erro.
- Fallback compacto (Card com ícone, mensagem e botão "Tentar novamente").
- Prop `name` para identificar o bloco no log.
- Reset automático ao remontar (chave de tentativa).

### 2. Wrapper `<SafeBlock>` por painel
Em `src/pages/Expedicao.tsx`, envolver **cada** painel e o KPI em `<ErrorBoundary>`:
```tsx
<ErrorBoundary name="No Pátio"><PainelNoPatio .../></ErrorBoundary>
<ErrorBoundary name="Chegou"><PainelChegou .../></ErrorBoundary>
<ErrorBoundary name="A Chegar"><PainelAChegar .../></ErrorBoundary>
<ErrorBoundary name="Expedidas"><PainelCargasFechadas .../></ErrorBoundary>
<ErrorBoundary name="KPIs"><ExpedicaoKpiCards .../></ErrorBoundary>
```
Replicar nas páginas críticas: `Dashboard/Index`, `Portaria`, `RegistroEntrada`, `Consolidado`.

### 3. Blindar hooks de dados (não derrubar a página em erro de rede)
Padronizar nos hooks compartilhados:
- `retry: 2` com backoff (já é default do react-query, garantir).
- `placeholderData: keepPreviousData` para que dados antigos permaneçam visíveis durante refetch.
- Em vez de `throw error`, retornar dado vazio + expor `error` para o componente decidir o fallback.
- Validar `data ?? []` em todos os consumidores.
- Hooks afetados: `useCargasDiaExpedicao`, `useStatusPortariaPorCarga`, `usePesoPorCarga`, `useMovimentacoes`, `useVeiculosEsperados`, `useCargasFechadasAguardando`.

### 4. Corrigir warnings de `forwardRef`
Investigar `PainelAChegar` e `PainelCargasFechadas` — provavelmente um `Tooltip`/`AlertDialogTrigger asChild` envolvendo o componente. Converter os componentes que recebem `ref` indiretamente para `forwardRef`, ou remover o `asChild` desnecessário.

### 5. Realtime resiliente
Em `useStatusPortariaPorCarga` e `useMovimentacoes`:
- Detectar `CHANNEL_ERROR` / `CLOSED` no callback de `.subscribe()`.
- Auto-reconectar com backoff (3s → 10s → 30s).
- Atualizar `useRealtimeStatus` para refletir o estado real (já parcialmente feito).

### 6. Memos defensivos no `Expedicao.tsx`
Os `useMemo` atuais assumem que `cargasDoDia`, `statusPortariaMap`, `movimentacoesComPeso` existem. Adicionar guards `?? []` / `?? new Map()` em todas as derivações para que o erro de uma query nunca quebre a derivação seguinte.

### 7. Logging estruturado
Quando um `ErrorBoundary` capturar erro, gravar no `console.error` com o `name` do bloco — fica fácil identificar nos próximos relatórios qual painel falhou sem afetar os outros.

## Arquivos que serão tocados

- **Novo:** `src/components/ErrorBoundary.tsx`
- `src/pages/Expedicao.tsx` (envolver blocos, guards nos memos)
- `src/pages/Index.tsx`, `src/pages/Portaria.tsx`, `src/pages/RegistroEntrada.tsx`, `src/pages/Consolidado.tsx` (envolver blocos principais)
- `src/hooks/useCargasDiaExpedicao.ts`, `src/hooks/useStatusPortariaPorCarga.ts`, `src/hooks/usePesoPorCarga.ts`, `src/hooks/useMovimentacoesPortaria.ts`, `src/hooks/useVeiculosEsperados.ts` (retry + keepPreviousData + reconexão realtime)
- `src/components/expedicao/PainelAChegar.tsx`, `src/components/expedicao/PainelCargasFechadas.tsx` (corrigir `forwardRef`)

## Resultado esperado

- Falha em uma query/painel **não derruba** os demais — o bloco mostra "Erro ao carregar — tentar novamente" e os outros seguem normais.
- Reconexão automática do realtime quando a conexão cair.
- Dados antigos permanecem visíveis durante refetch (sem "sumiço" momentâneo dos blocos).
- Warnings de `forwardRef` zerados.
- Mesma proteção aplicada também ao Dashboard, Portaria e Registro de Entrada.

## Fora do escopo

- Mudanças visuais ou de regras de negócio.
- Alterações em edge functions ou banco.
