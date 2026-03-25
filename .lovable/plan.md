
## Diagnóstico

Os logs confirmam que o OSRM público falha 100% das vezes:
```
[roteirizar] OSRM trip failed: Signal timed out.
[roteirizar] OSRM route also failed: Signal timed out.
[roteirizar] Haversine fallback: 2223.7km, 6 trechos
[roteirizar] Total time: 13901ms
```

O servidor `router.project-osrm.org` é público e sobrecarregado — mesmo 3s de timeout não é suficiente.

**Solução:** Trocar para **OpenRouteService (ORS)**, que:
- É gratuita (2.000 req/dia no plano free)
- Tem cobertura completa do Brasil com dados do OpenStreetMap
- Responde consistentemente em <1s
- Usa API key — sem throttling aleatório
- Retorna polyline com rota real por estradas, distâncias e durações por trecho

## Plano

### 1. Configurar API key do ORS (secret)
O usuário precisa criar uma conta gratuita em `openrouteservice.org` e gerar uma API key. A key será armazenada como secret `ORS_API_KEY`.

### 2. `supabase/functions/roteirizar/index.ts`
Substituir as chamadas OSRM pela API do ORS:

**Endpoint usado:** `POST https://api.openrouteservice.org/v2/directions/driving-car/geojson`

```json
// Payload ORS:
{
  "coordinates": [[-49.26, -16.68], [-41.17, -14.86], ...],
  "instructions": false,
  "geometry_simplify": false
}
```

**O ORS retorna:**
- `features[0].geometry.coordinates` → array de [lng, lat] da rota real por estradas
- `features[0].properties.segments[].distance` → km por trecho
- `features[0].properties.segments[].duration` → duração por trecho
- `features[0].properties.summary.distance` → distância total

**Mudanças no código:**
1. Remover todo o bloco de chamadas OSRM (`Promise.allSettled` com trip/route)
2. Fazer uma única chamada `POST` ao ORS com timeout de 8s
3. Parsear a resposta GeoJSON do ORS para extrair `geometry`, `trechos` e `distanciaTotal`
4. Manter o fallback haversine caso o ORS também falhe
5. Manter `estimado: false` quando ORS retorna dados reais, `estimado: true` no fallback

**Estrutura da nova lógica:**
```
try {
  const orsResult = await callORS(allPoints, ORS_API_KEY);
  // usar geometria real por estradas
  geometry = orsResult.coordinates.map(([lng, lat]) => [lat, lng]);
  distanciaTotal = orsResult.totalKm;
  trechos = orsResult.segments;
} catch {
  // haversine fallback (linha reta)
  estimado = true;
  // ... código existente
}
```

## Arquivos a Editar

| Arquivo | Mudança |
|---|---|
| `supabase/functions/roteirizar/index.ts` | Substituir chamadas OSRM por chamada única ao ORS API; manter fallback haversine |

## Pré-requisito

O usuário precisa:
1. Criar conta gratuita em **openrouteservice.org**
2. Gerar uma API key no dashboard
3. Informar a key para ser salva como secret `ORS_API_KEY`
