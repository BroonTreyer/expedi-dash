
## Diagnóstico definitivo — por que marcadores 1, 3 e 4 somem

### O problema real está em dois lugares simultâneos:

**BUG A — Front-end geocoda independente da edge function (desperdício + falha)**

O `RotaMap` faz seus próprios geocodings via Nominatim para exibir os marcadores. Mesmo que a edge function tenha geocodado tudo com sucesso e retornado `lat/lng` em `ordemOtimizada`, o mapa ignora essas coordenadas e refaz o geocoding do zero. Esse segundo geocoding enfrenta o rate-limit do Nominatim e silenciosamente falha para algumas cidades — daí os marcadores sumindo.

**BUG B — Delay ausente antes do item `i=0` no loop do front-end**

```typescript
for (let i = 0; i < uniquePairs.length; i++) {
  if (i > 0) await delay(350); // ← i=0 não tem delay!
  const coords = await geocode(cidade, uf);
}
```

A primeira requisição Nominatim é disparada imediatamente. Se o mapa foi montado logo após a edge function terminar (que também usou Nominatim), o Nominatim já está em cooldown → silencia a 1ª cidade → marcador 1 desaparece.

### A solução correta e definitiva

**Passar as coordenadas já geocodadas da edge function diretamente para o `RotaMap`**, eliminando o segundo geocoding redundante. A edge function retorna `ordemOtimizada[i].lat` e `ordemOtimizada[i].lng` — basta pré-popular o `geocodeCache` do `RotaMap` com esses dados antes de renderizá-lo.

Além disso, aumentar o delay inicial para `800ms` com `i >= 0` (sempre esperar), e adicionar múltiplos retries (3x) com backoff exponencial para as cidades que ainda precisam de geocoding (como na primeira abertura, antes de qualquer roteirização).

---

## Plano de correção

### Fix 1 — `RoteirizacaoDialog.tsx`: Passar coordenadas para pré-popular o cache do mapa

Quando a edge function retorna com sucesso, ela já tem `lat/lng` para cada destino em `ordemOtimizada`. Passar essas coordenadas como prop `coordsCache` para o `RotaMap`, que as insere diretamente no `geocodeCache` sem precisar refazer o geocoding.

```typescript
// Em RoteirizacaoDialog.tsx — após handleRoteirizar receber a resposta:
const coordsFromRoute = new Map<string, { lat: number; lng: number }>();
for (const opt of data.ordemOtimizada) {
  if (opt.lat && opt.lng) {
    coordsFromRoute.set(`${opt.cidade},${opt.uf}`, { lat: opt.lat, lng: opt.lng });
  }
}
setCoordsCache(coordsFromRoute); // novo state
// ...
<RotaMap coordsCache={coordsCache} ... />
```

### Fix 2 — `RotaMap.tsx`: Aceitar `coordsCache` prop e pré-popular `geocodeCache`

Adicionar prop `coordsCache?: Map<string, Coords>`. No `useEffect`, antes de verificar `needsFetch`, inserir as coordenadas do cache externo no `geocodeCache` do módulo:

```typescript
// Pré-popular geocodeCache com coordenadas recebidas da edge function
if (coordsCache && coordsCache.size > 0) {
  for (const [key, coords] of coordsCache) {
    if (!geocodeCache.has(key)) geocodeCache.set(key, coords);
  }
}
// Agora needsFetch será false para todas as cidades já geocodadas pela edge fn
```

### Fix 3 — `RotaMap.tsx`: Corrigir delay no loop de geocoding

Mudar `if (i > 0) await delay(350)` para `await delay(i === 0 ? 0 : 1000)` e adicionar 3 retries com backoff progressivo (1s, 2s, 4s) para garantir que cidades que falham na primeira tentativa sejam reprocessadas:

```typescript
for (let i = 0; i < uniquePairs.length; i++) {
  // Sempre esperar antes de qualquer request (exceto primeiro, que espera 300ms também)
  await delay(i === 0 ? 300 : 1200);
  // ...
  let coords = null;
  for (const wait of [0, 1000, 2000, 4000]) { // até 4 tentativas
    if (wait > 0) await delay(wait);
    coords = await geocode(cidade, uf);
    if (coords) break;
  }
}
```

### Arquivos a editar

| Arquivo | Mudança |
|---|---|
| `src/components/dashboard/RoteirizacaoDialog.tsx` | Extrair `lat/lng` de `ordemOtimizada` → criar state `coordsCache` → passar como prop para `RotaMap` |
| `src/components/dashboard/RotaMap.tsx` | Aceitar prop `coordsCache`, pré-popular `geocodeCache` antes de verificar `needsFetch`; corrigir delays e retries no loop de geocoding |
