

# Auditoria Completa do Mapa de Roteirização

Após leitura exaustiva de `RotaMap.tsx`, `RoteirizacaoDialog.tsx`, `FechamentoLoteDialog.tsx` e `roteirizar/index.ts`, encontrei **27 bugs/problemas concretos**.

---

## BUGS CRÍTICOS (quebram funcionalidade)

### BUG 1 — Chave de cache do frontend usa nome raw, backend usa UPPERCASE normalizado
`RoteirizacaoDialog.tsx` linha 276: ao popular `coordsCache`, usa `opt.cidade` diretamente da resposta, que é o nome normalizado (`"SALVADOR"`, `"MANAUS"`). Porém `RotaMap.tsx` linha 281 busca por `${d.cidade},${d.uf}` onde `d.cidade` vem dos `activeGroups` que têm o nome original dos pedidos (pode ser `"Salvador"` ou `"salvador"`). **As chaves nunca batem → o cache é inútil → todo mundo vai para o Nominatim mesmo após roteirizar.**

### BUG 2 — Frontend geocode_cache query sem normalização
`RotaMap.tsx` linha 52-56: query ao banco usa `p.cidade` cru (sem `.toUpperCase()` / `normalize`). O banco armazena `"SALVADOR"`, mas o frontend envia `"Salvador"` → **zero cache hits, Nominatim sempre.**

### BUG 3 — `geocodeViaNominatim` no frontend não tem User-Agent
`RotaMap.tsx` linha 76-80: faz fetch ao Nominatim sem `User-Agent`. A política de uso do Nominatim exige User-Agent válido; sem ele, requisições são bloqueadas com `403` em alta frequência → **marcadores simplesmente não aparecem.**

### BUG 4 — `originalIndex` aponta para índice no array de destinos enviados, não no array `groups`
`RoteirizacaoDialog.tsx` linha 311: `const found = prev[opt.originalIndex]`. O `originalIndex` é o índice no array `destinos` enviado à edge function (um destino por grupo = correto para a maioria dos casos), **MAS** se um grupo for excluído (`excludedGroupKeys`) antes de roteirizar, o índice fica errado. O array `destinosParaRoteirizar` (linha 245) é um subset de `activeGroups`, então `opt.originalIndex=0` pode não corresponder a `prev[0]`.

### BUG 5 — Trechos mostrados nos cards são dos destinos, não da saída de cada um
`RoteirizacaoDialog.tsx` linhas 366-372: `legIdx = i + 1` para mostrar "km até o próximo". `trechos[0]` = Goiânia → dest1. Então para `i=0` (dest1), `legIdx=1` = trecho dest1→dest2. **Isso está correto**, mas `trechos` são reconstruídos na edge function usando `osrmOrder[fromVisitPos]` que usa o índice dos `optimizedGroups` (pré-OSRM), não dos `orderedGroups` (pós-OSRM). Se a ordem OSRM diferir da 2-opt, os labels `de/para` nos trechos ficam trocados.

### BUG 6 — Tempo de duração exibido com unidade errada quando > 60 min
`RoteirizacaoDialog.tsx` linha 121: `~{trecho.duracao} min até próximo`. Duração calculada no backend: `Math.round(legs[i].duration / 60)`. Para trechos longos (ex: Goiânia → Manaus = ~2.800 km ≈ 1.680 min = **28 horas**), exibe `~1680 min` em vez de `~28h`. Sem conversão horas/minutos.

### BUG 7 — `FechamentoLoteDialog` não recebe `coordsCache` → geocoding duplicado do zero
`FechamentoLoteDialog.tsx` linha 167-174: `<RotaMap>` é chamado sem `coordsCache`. O `RotaMap` vai geocodificar tudo de novo via Nominatim, sem usar as coordenadas já calculadas na roteirização. **Marcadores podem não aparecer no mapa de fechamento.**

### BUG 8 — OSRM `/trip` com `source=first&destination=last` e `roundtrip=false` + validação fraca
`roteirizar/index.ts` linha 414: validação `validationRatio <= 2.5`. Para rotas geograficamente difusas (Brasil Norte-Sul), o OSRM pode retornar rota absurda de 14.000 km e a 2-opt heurística retorna ~9.000 km — ratio = 1,55 < 2,5 → **OSRM absurdo é aceito**. O threshold de 2.5x é muito alto.

### BUG 9 — Trechos `de/para` com label errado quando `hasOrigin=false`
`roteirizar/index.ts` linhas 540-554 (fallback route): `fromIdx = i - (hasOrigin ? 1 : 0)`. Quando `hasOrigin=false`, `fromIdx=0` → `orderedGroups[0]` → label correto. Mas a origem nunca é mostrada no `de` do primeiro trecho — exibe o **primeiro destino** como origem em vez de "Goiânia".

### BUG 10 — `FitBounds` recalcula bounds incluindo marcadores deslocados por offset
`RotaMap.tsx` linha 298-302: `allBoundsPoints = [...sortedPoints]`. Os `sortedPoints` têm offsets de `+0.003° × count`. Para cidades com muitos clientes (ex: 10 pedidos em Manaus = +0.03°), o bounds calculado inclui pontos ~3km fora do centro real → **mapa com zoom ligeiramente errado, cidade cortada**.

---

## BUGS DE LÓGICA / DADOS

### BUG 11 — `buildCityGroups` usa nome normalizado como key mas `members` guardam nome original
`roteirizar/index.ts` linha 300: key = `normalizarCidade(g.cidade)`. Mas `members[0].cidade` (usada no label do trecho) tem o nome UPPERCASE já, pois veio de `normalizarCidade` no passo anterior. Porém `origemCidade` passado pelo frontend pode ter acento → label `de` do primeiro trecho exibe "Goiânia" enquanto os demais exibem "SALVADOR". **Inconsistência de capitalização nos trechos.**

### BUG 12 — `RotaMap` recria `MapContainer` desnecessariamente ao mudar `coordsCache`
`RotaMap.tsx` linha 184: `citySetKey` muda → `mapKey` incrementa → `MapContainer` é destruído e recriado. `citySetKey` não inclui `coordsCache` na dependência, mas o `useEffect` (linha 268) tem `[citySetKey, coordsCache]`. Quando `coordsCache` muda (após roteirização), **o mapa não é recriado** mas o geocoding é reexecutado desnecessariamente.

### BUG 13 — Nominatim no frontend ainda chamado mesmo com `coordsCache` completo
`RotaMap.tsx` linha 229: após pré-popular `geocodeCache` com `coordsCache`, a verificação `missingFromCache` usa `!geocodeCache.has(key)`. Mas a chave inserida é `"GOIANIA,GO"` e a chave buscada é `"Goiânia,GO"` (sem normalização) → miss no cache → **vai ao Nominatim mesmo com tudo cacheado**.

### BUG 14 — `2-opt` limitado a 500 iterações pode parar sem convergir
`roteirizar/index.ts` linha 263: `maxIterations = 500`. Para 21 cidades, o 2-opt pode precisar de mais iterações para convergir. O log `[2-opt] Completed in 500 iterations` indica que parou por limite, não por convergência. **Rota sub-ótima com rotas maiores.**

### BUG 15 — `greedySort` tem complexidade O(N²) sem otimização: para 21 cidades × 21 = 441 operações, mas para 50+ será lento
Não há limite no greedy — para cargas futuras com 50+ destinos, o frontend pode travar.

### BUG 16 — `twoOptImprove` recalcula `routeDistance` inteiramente a cada iteração interna
`roteirizar/index.ts` linha 268: `const currentDist = routeDistance(origin, route)` dentro do while loop externo, mas fora do for interno. Se há melhoria, `currentDist` fica desatualizado até a próxima iteração — comparações subsequentes no mesmo loop usam distância velha, podendo aceitar ou rejeitar swaps incorretamente.

### BUG 17 — Polilinha renderizada mesmo com 1 posição
`RotaMap.tsx` linha 390: `{polylinePositions.length > 1 && ...}`. Correto, mas `polylinePositions` pode ter coordenadas `[0, 0]` se o backend retornar geometria inválida → **linha no oceano Atlântico**.

---

## BUGS DE LAYOUT / UI

### BUG 18 — Mapa com altura fixa `320px` no RoteirizacaoDialog mas `350px` no Suspense fallback
`RoteirizacaoDialog.tsx` linha 411: fallback tem `h-[350px]`. `RotaMap.tsx` linha 345: `className="h-[320px]"`. Ao carregar, o container "encolhe" 30px — causa layout jump.

### BUG 19 — Mapa dentro do `FechamentoLoteDialog` sem `loading` prop passada
`FechamentoLoteDialog.tsx` linha 167: `<RotaMap>` sem `loading={false}`. Quando geocodificando, não exibe overlay de loading — usuário vê mapa vazio sem feedback.

### BUG 20 — `distanciaTotal` no header do `FechamentoLoteDialog` sem formatação de número
`FechamentoLoteDialog.tsx` linha 142: `{roteirizacao.distanciaTotal} km`. Para 14.279 km exibe `14279 km` sem separador de milhar → deveria ser `14.279 km`.

### BUG 21 — Marcador de origem sempre exibe letra "O" mesmo quando origem é customizável
`RotaMap.tsx` linha 356: `createOrigemIcon("O")`. Se no futuro (ou já) a origem não for Goiânia, o marcador ainda mostra "O". Deveria mostrar a sigla da cidade ou "GYN".

### BUG 22 — Popup do marcador de destino trunca nomes longos de cliente
`RotaMap.tsx` linhas 378-385: `<div className="text-xs">` sem `max-width` definido. Nomes longos como "DISTRIBUIDORA NORTE AMAZONICA LTDA" excedem o popup → **overflow sem truncate**.

### BUG 23 — Trechos exibidos em grid `sm:grid-cols-2` mas o texto "A → B" é truncado com `truncate`
`RotaMap.tsx` linha 410: `<span className="font-medium text-foreground truncate">`. Em tela pequena, a coluna é ~50% da largura e corta nomes como "VITORIA DA CONQUISTA → EUNAPOLIS".

### BUG 24 — `distanciaTotal` no header do `RotaMap` sem `toLocaleString`
`RotaMap.tsx` linha 319: `{distanciaTotal} km total`. Sem formatação → exibe `14279.5 km total` em vez de `14.279,5 km total`.

### BUG 25 — `scrollWheelZoom={false}` sem `dragging` bloqueado em mobile
`RotaMap.tsx` linha 346: scroll bloqueado mas drag ativo. Em mobile, ao tentar rolar a página através do mapa, o mapa captura o toque e **move o mapa em vez de rolar a página**.

### BUG 26 — Ícone de origem não usa `useMemo` — recria a cada render
`RotaMap.tsx` linha 356: `icon={createOrigemIcon("O")}` chamado inline. Leaflet lida com isso, mas gera GC desnecessário a cada render.

### BUG 27 — `forwardRef` em `FitBounds` é desnecessário e incorreto
`RotaMap.tsx` linha 144: `FitBounds` usa `forwardRef` mas não usa `_ref` em lugar algum, e não é chamado com `ref`. Código morto confuso.

---

## Resumo por arquivo

| Arquivo | Bugs |
|---|---|
| `RotaMap.tsx` | 3, 10, 12, 13, 17, 18, 21, 22, 23, 24, 25, 26, 27 |
| `RoteirizacaoDialog.tsx` | 1, 4, 5, 6, 11 |
| `FechamentoLoteDialog.tsx` | 7, 19, 20 |
| `roteirizar/index.ts` | 2 (via frontend bug 2), 8, 9, 14, 15, 16 |

---

## O que será corrigido

### `RotaMap.tsx`
1. Normalizar `cidade` para UPPERCASE antes de qualquer lookup de cache (fix bugs 1, 2, 13)
2. Adicionar `User-Agent` no Nominatim (fix bug 3)
3. Excluir pontos com offset do `allBoundsPoints` — usar centróides reais para bounds (fix bug 10)
4. Converter duração: se ≥ 60 min, exibir em horas e minutos (fix bug 6, compartilhado)
5. Unificar altura `h-[320px]` para consistência com fallback do Suspense (fix bug 18)
6. Adicionar `toLocaleString("pt-BR")` no `distanciaTotal` (fix bug 24)
7. Bloquear `dragging` via hook `isMobile` em viewports pequenos (fix bug 25)
8. Remover `forwardRef` desnecessário em `FitBounds` (fix bug 27)
9. Adicionar `max-w-[200px]` no popup do marcador (fix bug 22)

### `RoteirizacaoDialog.tsx`
10. Normalizar chave ao popular `coordsCache`: `normalizarCidade(opt.cidade)` (fix bug 1)
11. Corrigir `originalIndex` vs grupo excluído: mapear por `codigoCliente` quando disponível (fix bug 4)
12. Converter duração no display: `trecho.duracao >= 60 ? X h Y min : X min` (fix bug 6)

### `FechamentoLoteDialog.tsx`
13. Passar `coordsCache` (via prop ou recalcular de `roteirizacao`) ao `RotaMap` (fix bug 7)
14. Formatar `distanciaTotal` com `toLocaleString("pt-BR")` (fix bug 20)
15. Passar `loading={false}` explicitamente ao `RotaMap` (fix bug 19)

### `roteirizar/index.ts`
16. Reduzir threshold de validação OSRM de `2.5` para `1.8` (fix bug 8)
17. Usar `oCidade` (com acento) normalizado no label `de` do primeiro trecho (fix bug 11)
18. Corrigir cálculo de `currentDist` dentro do loop interno do 2-opt (fix bug 16)

