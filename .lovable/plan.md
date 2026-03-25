
## Bugs identificados nos prints — diagnóstico completo

### BUG 1 — Marcadores 3 e 4 somem do mapa (Eunápolis e Porto Seguro)

**Causa**: Nominatim tem rate-limit silencioso. Quando o front-end faz 7 requisições geocode simultâneas em sequência rápida (6 destinos + origem), o Nominatim retorna HTTP 200 mas com array vazio `[]` para algumas cidades — silenciosamente. O código em `RotaMap.tsx` linha 52-55:
```typescript
const data = await res.json();
if (data.length > 0) {
  // só entra aqui se retornou resultado — Eunápolis e Porto Seguro não entram
}
```
Resultado: `geocodeCache` não armazena Eunápolis e Porto Seguro → `geocodedCoords` fica sem essas chaves → `sortedPoints` filtra fora (`if (!base) continue`) → marcadores 3 e 4 nunca são renderizados.

**Fix**: Adicionar delay de 300ms entre cada requisição Nominatim no `useEffect` do RotaMap, e também na edge function. Isso respeita o rate limit do Nominatim (1 req/segundo por User-Agent).

---

### BUG 2 — Rota subótima: vai para MT antes de BA (order errada no greedy)

**Causa**: O OSRM `/trip` fez timeout (log: `OSRM trip failed: Signal timed out`) e o fallback greedy rodou. Mas o greedy resultou em: `RONDONOPOLIS → CUIABA → EUNAPOLIS → PORTO SEGURO → ILHEUS → JUAZEIRO DO NORTE`.

Ir de Goiânia para Rondonópolis (MT, ~480km oeste) antes de Ilhéus (BA, ~850km leste) é ilógico — o greedy está funcionando mas a ordem depende dos resultados do geocoding. O problema: como Eunápolis e Porto Seguro **falharam no geocoding da edge function também**, eles foram **excluídos do `greedilyOrdered`**. Com apenas 4 pontos (Rondonópolis, Cuiabá, Ilhéus, Juazeiro), o greedy calculou a sequência errada porque tinha menos dados.

Mas olhando os logs: `Geocoded 6/6 destinations` — todos geocodificaram na edge function. O problema do greedy então é simplesmente que o nearest-neighbor a partir de Goiânia escolhe Rondonópolis como mais próximo, o que está errado geometricamente.

Verificando: Goiânia (lat=-16.68, lng=-49.26). Rondonópolis (lat=-16.47, lng=-54.63) = ~550km. Ilhéus (lat=-14.78, lng=-39.04) = ~1070km. Logo o greedy está correto ao escolher Rondonópolis primeiro em linha reta, mas a rota viária real de Goiânia → Ilhéus/BA → MT → CE → BA é muito mais longa.

O verdadeiro problema da rota: o OSRM `/trip` (que faria a otimização real) falhou por timeout. O servidor público OSRM com 7+ pontos demora mais de 8s. **Fix: aumentar timeout para 15s**, e usar o servidor alternativo `valhalla.openstreetmap.de` ou `osrm.router.project-osrm.org` como backup.

---

### BUG 3 — Trechos com distâncias erradas (2341.9 km de Rondonópolis→Cuiabá sendo que são ~215km)

**Causa**: No fallback `/route`, os trechos são montados com indexação incorreta. Linhas 299-309 da edge function:
```typescript
const startLeg = hasOrigin ? 1 : 0; // pula leg 0 = origem→dest1
for (let i = startLeg; i < legs.length; i++) {
  const fromIdx = i - (hasOrigin ? 1 : 0); // fromIdx = 0 quando i=1
  const toIdx = fromIdx + 1;               // toIdx = 1
```

Com 6 destinos + origem = 7 waypoints = 6 legs. `legs[0]` = Goiânia→Rondonópolis, `legs[1]` = Rondonópolis→Cuiabá, etc. O código começa em `i=1` (startLeg=1) mas **inclui apenas legs[1] em diante**, ou seja, **omite o primeiro trecho** (Goiânia→Rondonópolis = 214.8km) e desloca todos os outros. Então:
- `trechos[0]` na UI deveria ser "Goiânia → Rondonópolis: 214.8km" mas é calculado como `fromIdx=-1` que usa o fallback `oCidade` para DE, e fica com distância de `legs[1]` (Rondonópolis→Cuiabá = 64km)?

Não, olhando de novo: `startLeg = hasOrigin ? 1 : 0`. Se `hasOrigin=true`, começa em `i=1`. `fromIdx = 1 - 1 = 0` → `greedilyOrdered[0]` = Rondonópolis. `toIdx=1` → Cuiabá. Distância = `legs[1].distance` = Rondonópolis→Cuiabá = ~215km. Parece correto...

Mas o print mostra "SENDAS DISTRIBUIDORA S/A → SENDAS DISTRIBUIDORA S/A ... 214.8 km" (Rondonópolis→Cuiabá usando o mesmo cliente para ambos, pois são clientes diferentes na mesma rede mas o sistema usa `g.nomeCliente` e ambos são "SENDAS DISTRIBUIDORA S/A"). E "2341.9 km" aparece como "SENDAS DISTRIBUIDORA S/A → MATEUS EUNAPOLIS".

Rondonópolis → Eunápolis = 2341.9km? Isso não faz sentido. Cuiabá → Eunápolis seria ~2000km, mas de forma mais direta. Porém olhando de novo: **o OSRM `/trip` SUCEDEU para os 2 destinos menores** (log: `OSRM trip success. Order: ILHEUS → JUAZEIRO DO NORTE`) e o `/trip` para 6 destinos **falhou por timeout**. Então para 6 destinos, usou `/route` com greedy. O greedy colocou Rondonópolis→Cuiabá→Eunápolis→Porto Seguro→Ilhéus→Juazeiro. A distância Cuiabá→Eunápolis é de fato enorme (~2300km) por estrada.

Então as distâncias podem estar corretas para a rota gerada, mas a rota em si é subótima. O real problema é que com OSRM `/trip` falhando, a rota fica na ordem greedy que é ruim.

**Fix real**: Aumentar timeout do OSRM `/trip` de 8s para 15s para dar tempo ao servidor público processar 7 waypoints. E adicionar um segundo servidor OSRM como fallback antes de desistir para o greedy.

---

### BUG 4 — Label dos trechos usa `cliente` em vez de cidade (confuso: "SENDAS → SENDAS")

No código da edge function, linha 266-267:
```typescript
const fromLabel = fromGeoIdx < 0 ? oCidade : (greedilyOrdered[fromGeoIdx]?.cliente ?? oCidade);
const toLabel = toGeoIdx < 0 ? oCidade : (greedilyOrdered[toGeoIdx]?.cliente ?? "");
```

Usa `cliente` (nome do cliente) como label do trecho, então dois clientes iguais mostram "SENDAS → SENDAS". Deveria usar `cidade` para clareza.

---

## Plano de Correção

### 1. `supabase/functions/roteirizar/index.ts`
- **Delay entre geocodings**: adicionar `await new Promise(r => setTimeout(r, 350))` entre chamadas Nominatim na edge function para não throttlear
- **Timeout do OSRM `/trip` de 8s → 15s**: dar mais tempo para o servidor público processar 6+ waypoints
- **Label dos trechos**: trocar `cliente` por `cidade` no cálculo de `fromLabel`/`toLabel`

### 2. `src/components/dashboard/RotaMap.tsx`
- **Delay entre geocodings**: adicionar delay de 350ms entre cada `geocode()` no `useEffect` do loop de destinos para evitar rate limit do Nominatim no front-end
- **Retry em cidades que falharam**: se `geocodedCoords` terminar com menos cidades que `uniquePairs.length`, re-tentar as que faltam após 2 segundos (uma única vez)

### 3. `src/components/dashboard/RoteirizacaoDialog.tsx`  
- **Sem mudanças necessárias** — a lógica de mapeamento `originalIndex` está correta

### Arquivos a editar

| Arquivo | Mudança |
|---|---|
| `supabase/functions/roteirizar/index.ts` | Delay 350ms entre geocodings; timeout OSRM de 8s→15s; label trechos usa cidade |
| `src/components/dashboard/RotaMap.tsx` | Delay 350ms entre geocodings no front-end; retry automático para cidades que falharam |
