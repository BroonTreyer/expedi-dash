# Plano — Atualização ao vivo da aba "Faltando agora"

## Diagnóstico
A aba depende **só** do canal realtime do Supabase. Quando o canal desconecta (aba em background, sleep, wifi oscilando), a tela trava porque:
- `staleTime` global é 30s, mas **nada dispara refetch** sem realtime.
- `refetchOnWindowFocus: false` global — voltar pra aba não atualiza.
- Não há `refetchInterval` na query de carregamentos.

Resultado: usuário vê dados antigos até navegar pra outra rota e voltar (ou dar F5).

## Solução
Adicionar **polling leve + refetch ao focar** **somente quando a aba "Faltando agora" estiver montada** — sem alterar comportamento global nem do Painel principal.

### Mudanças

**1. `src/pages/Rupturas.tsx` — `FaltandoAgora`**
- Importar `useQueryClient` e usar `queryClient.invalidateQueries({ queryKey: ["carregamentos"] })` em dois gatilhos locais:
  - `setInterval` a cada **20s** enquanto a aba estiver visível (`document.visibilityState === "visible"`).
  - Listener de `visibilitychange` → invalida ao voltar foco da aba.
  - Listener de `online` (window) → invalida quando rede volta.
- Limpar interval/listeners no cleanup do `useEffect`.
- Mostrar um pequeno indicador "Atualizado há Xs" no cabeçalho do bloco (usa `dataUpdatedAt` do `useQuery`, exposto via `useCarregamentos`).

**2. `src/hooks/useCarregamentos.ts`**
- Retornar também `dataUpdatedAt` da query (já vem no `query` spread, só garantir que o tipo permite uso).
- **Sem** mexer em `staleTime`, `refetchInterval` ou `refetchOnWindowFocus` globais — mantém o comportamento atual do painel principal e demais telas intacto.

### Por que essa abordagem
- Cirúrgica: só a aba "Faltando agora" recebe o polling — não aumenta carga do banco para o resto do app.
- Resiliente: cobre os 3 cenários de falha (realtime caído, aba em background voltando, internet voltando).
- 20s é suficiente porque o realtime continua sendo o canal primário (atualização instantânea quando funciona); o polling é rede de segurança.
- Pausa quando aba está oculta → zero requests desnecessários.

### Arquivos editados
- `src/pages/Rupturas.tsx` (apenas dentro de `FaltandoAgora`)
- `src/hooks/useCarregamentos.ts` (mudança mínima, se necessária para expor `dataUpdatedAt`)

### Validação
- Abrir "Faltando agora", deixar em background 1 min, voltar → deve refetch imediato.
- Criar uma ruptura em outra sessão → aparece em ≤20s mesmo se realtime estiver desconectado.
- Painel principal e outras telas continuam idênticos (sem polling extra).
