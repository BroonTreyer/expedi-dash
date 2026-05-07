# Por que continua "indisponível"

Os logs mostram que **a chamada problemática NÃO é a otimização inicial**, e sim o **recálculo automático após reordenar manualmente** os destinos no diálogo:

1. Ao reordenar (drag-and-drop), o front chama a edge function com `mode: "fastest"` (preserve order) — **não** `"both"`.
2. Com `mode="fastest"`: `wantBoth=false`, então o **fallback OSRM-alternativas (que adicionei na rodada anterior) nunca dispara** — ele só roda dentro de `if (wantBoth && !vFast && !vEcon)`.
3. ORS recusa a rota (`HTTP 400 código 2004`, > 6.000 km) → `vFast = null`.
4. O fluxo cai no fallback OSRM "público single-route" (linha 726+), que popula `geometria`/`distanciaTotal` mas **NÃO seta `vFast`**.
5. A resposta volta com `rotas: undefined` (porque `wantBoth=false`).
6. No front (`RoteirizacaoDialog.tsx` linhas 348-355): como `data.rotas` é `undefined` e `mode==="preserve"`, executa `setRotaRapida(null); setRotaEconomica(null);` — **zera os botões** que antes estavam preenchidos.

A confirmação está nos logs: aparece `"Tentando OSRM público"` (legacy single, linha 730), e **nunca** `"Tentando OSRM alternativas"` (linha 664).

# Correção

Apenas `supabase/functions/roteirizar/index.ts` e um pequeno ajuste em `src/components/dashboard/RoteirizacaoDialog.tsx`.

## 1. Edge function `roteirizar`

- **Disparar o fallback OSRM-alternativas também quando `mode="fastest"` ou `"cheapest"`**: trocar a condição `if (wantBoth && !vFast && !vEcon)` por `if (!vFast && !vEcon && (wantFast || wantEcon))`. Quando `mode="fastest"`, basta extrair a rota mais rápida; quando `"cheapest"`, a mais curta.
- **Quando o OSRM single-route legacy (linha 726+) for o único provedor que respondeu**, construir um `Variant` a partir dele e atribuir a `vFast` (sempre) e `vEcon` (apenas se `wantEcon`, usando a mesma rota). Isso garante que a resposta sempre tenha `rotas.rapida` populada quando há geometria válida.
- **Sempre retornar `rotas: { rapida, economica }` no JSON final** (não apenas quando `wantBoth`). Quando `mode="fastest"`, `economica` pode ser `null`; quando `mode="cheapest"`, `rapida` pode ser `null`. Isso simplifica o front e mantém compat.

## 2. Front `RoteirizacaoDialog.tsx` (linhas 348-355)

- Em `mode === "preserve"` (recálculo após reordenação manual), **não zerar `rotaRapida`/`rotaEconomica` se a edge function devolver `data.rotas.rapida`** — apenas atualizar com a nova variante recalculada.
- Se `data.rotas?.rapida` vier `null` mas `data.geometria` vier preenchido, **construir um Variant local** a partir de `data` (geometria, distanciaTotal, soma de duracoes dos trechos, pedagios) e setar em `rotaRapida` para que o botão continue habilitado.

# Resultado esperado

- Após reordenar a viagem de ~9.700 km:
  - O botão **Mais Rápida** continua habilitado mostrando `9.700,0 km · ~Xh · 0 ped.` (OSRM não retorna pedágios).
  - **Mais Econômica** mostra `indisponível` somente quando o OSRM público devolve uma única rota (limite real do provedor para rotas dessa magnitude) — comportamento esperado e documentado.
- Em rotas normais (< 6.000 km), o ORS continua respondendo as duas variantes com pedágios — sem regressão.

# Arquivos afetados

- `supabase/functions/roteirizar/index.ts`
- `src/components/dashboard/RoteirizacaoDialog.tsx`

Sem mudanças em DB, RLS, secrets ou config.
