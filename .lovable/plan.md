
## Diagnóstico

Os logs do edge function revelam o problema real:

```
[roteirizar] OSRM trip failed: Signal timed out.
[roteirizar] OSRM route also failed: Signal timed out.
[roteirizar] Total time: 20685ms
```

**Ambas as chamadas OSRM estão falhando com timeout** (trip usa 12s, route usa 8s = 20s total). Quando isso acontece, o código cai no bloco `catch` final (linha 564–568):

```ts
} catch (routeErr) {
  // Pure 2-opt fallback with haversine distance estimation
  distanciaTotal = Math.round(twoOptDist * 10) / 10;
  // ← NÃO preenche trechos, NÃO preenche geometry
}
```

**Resultado:**
- `geometry = []` → sem linha de rota no mapa
- `trechos = []` → sem km entre pontos
- `distanciaTotal` preenchido com estimativa haversine, mas os outros campos ficam vazios

**Solução em dois níveis:**

### 1. Edge Function — fallback puro com trechos haversine

Quando o OSRM `/route` também falha, calcular `trechos` e uma `geometry` simplificada (linha reta entre pontos) usando as coordenadas geocodadas que já estão em memória. Isso garante que o mapa **sempre** mostre algo útil, mesmo sem acesso ao OSRM.

```ts
// No catch do OSRM /route (linha 565):
distanciaTotal = Math.round(twoOptDist * 10) / 10;

// Gerar trechos haversine
const allPointsForLegs = [
  { cidade: oCidade, ...originFallback },
  ...orderedGroups.map(g => ({ cidade: g.members[0]?.cidade ?? "", lat: g.lat, lng: g.lng }))
];
for (let i = 0; i < allPointsForLegs.length - 1; i++) {
  const from = allPointsForLegs[i];
  const to = allPointsForLegs[i + 1];
  trechos.push({
    de: from.cidade,
    para: to.cidade,
    km: Math.round(haversine(from.lat, from.lng, to.lat, to.lng) * 10) / 10,
    duracao: Math.round((haversine(from.lat, from.lng, to.lat, to.lng) / 60) * 60),
  });
}

// Gerar geometry de linha reta (straight-line polyline)
geometry = allPointsForLegs.map(p => [p.lat, p.lng] as [number, number]);
```

### 2. Edge Function — reduzir timeout e tentar OSRM mais rápido

O OSRM público está sobrecarregado/lento. Reduzir o timeout do trip de 12s para **8s** e do route de 8s para **5s**. Com 6 cidades, o OSRM deveria responder em <2s quando disponível. Isso libera mais tempo para o fallback processar.

### 3. Frontend — indicador visual "rota estimada"

Quando `geometry` tem apenas pontos de conexão direta (sem a curva das estradas reais), mostrar um badge "Rota estimada" em vez de silenciosamente mostrar linha reta. Isso evita confusão do usuário.

## Arquivos a Editar

| Arquivo | Mudança |
|---|---|
| `supabase/functions/roteirizar/index.ts` | 1) No `catch` do OSRM `/route`, gerar `trechos` haversine + `geometry` linha reta; 2) Reduzir timeouts (trip: 12s→8s, route: 8s→5s); 3) Retornar campo `estimado: true` quando fallback puro |
| `src/components/dashboard/RotaMap.tsx` | Mostrar badge "Distância estimada" quando `prop estimado=true` |
| `src/components/dashboard/RoteirizacaoDialog.tsx` | Passar `estimado` ao `RotaMap` quando retornado pela edge function |
