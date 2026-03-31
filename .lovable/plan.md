

# Roteirização em Linha Reta — Diagnóstico e Correção

## Problema

A rota está aparecendo em linha reta porque o ORS (OpenRouteService) falha para certas coordenadas e o sistema cai no fallback haversine, que gera geometria de linha reta (apenas os pontos de origem/destino conectados).

Nos logs:
```
ORS HTTP 404: "Could not find routable point within a radius of 350.0 meters 
of specified coordinate 4: -35.0056000 -8.1817000"
```

O raio padrão do ORS (350m) é muito pequeno — se a coordenada geocodificada cai longe de uma estrada mapeada, o ORS rejeita a rota inteira. Quando isso acontece, a linha 482 gera geometria com apenas os waypoints (linha reta entre pontos).

## Solução

**`supabase/functions/roteirizar/index.ts`**:

1. Adicionar parâmetro `radiuses` na requisição ORS com valor maior (ex: 5000m por waypoint) para que o ORS encontre estradas próximas mesmo com coordenadas imprecisas

2. Se ORS falhar mesmo com raio maior, tentar uma segunda chamada ao ORS removendo o waypoint problemático (skip parcial) antes de cair no haversine

3. No fallback haversine, marcar `estimado = true` (já faz) — mas o frontend já mostra o badge "Distância estimada"

Mudança principal — na chamada ORS (linha ~407):
```typescript
body: JSON.stringify({
  coordinates: orsCoordinates,
  instructions: false,
  geometry_simplify: false,
  preference: "recommended",
  radiuses: orsCoordinates.map(() => 5000), // 5km snap radius
}),
```

| Arquivo | Mudança |
|---|---|
| `supabase/functions/roteirizar/index.ts` | Adicionar `radiuses: [5000, ...]` na chamada ORS para aumentar raio de snap de 350m para 5km |

