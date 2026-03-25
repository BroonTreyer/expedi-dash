
## Diagnóstico completo da imagem + código

Da imagem enviada, os problemas são claros:

1. **14.279 km — rota absurda**: Goiânia → Bahia → Nordeste → **Macapá** → **Manaus** → MT → SP. O OSRM `/trip` está falhando ou retornando resultado incorreto para 22+ pontos, e o fallback para greedy nearest-neighbor está sendo usado — que produz uma rota péssima para rotas longas e geograficamente dispersas.

2. **Cidades duplicadas no trajeto**: "SALVADOR → SALVADOR" (1 km), "MANAUS → MANAUS" (0.7 km + 1.2 km), "CUIABA → CUIABA" — indica que os offsets de 0.003° estão sendo tratados como cidades distintas pelo OSRM, gerando múltiplas paradas na mesma cidade.

3. **Bug crítico no mapeamento do OSRM /trip**: O waypoint_index do OSRM retorna a posição ótima de cada ponto na rota, mas o código atual usa `greedilyOrdered[geoIdx]` para montar `orderedDestinos` — misturando os índices do greedy (pré-sort) com os índices do OSRM. Para rotas grandes, isso produz ordem incorreta.

4. **Greedy nearest-neighbor falha em rotas inter-regionais**: Para 21 destinos espalhados por BA, SE, CE, AM, AP, MT, SP — o greedy fica preso em ótimos locais péssimos (vai pro Nordeste → não consegue voltar racionalmente para o Norte).

### Root causes

**Problema A — OSRM /trip com >15 pontos**: O servidor público OSRM (router.project-osrm.org) tem limitação de throughput e às vezes retorna `code: "Ok"` mas com waypoints em ordem errada para muitas paradas. O código confia nesse resultado sem validá-lo.

**Problema B — Offsets de coordenadas para mesma cidade**: O código aplica `g.lat += count * 0.003` ANTES de enviar ao OSRM. Isso faz o OSRM ver Manaus1 e Manaus2 como cidades diferentes a ~330m de distância, causando duas paradas "Manaus → Manaus" na rota.

**Problema C — Mapeamento de índices pós-OSRM /trip**: Após receber a ordem otimizada do OSRM, o código usa `greedilyOrdered[geoIdx]` para reconstruir a lista. Quando hasOrigin=true, há um offset de -1 que pode estar errado dependendo do que o OSRM retorna nos waypoints.

**Problema D — Sem validação da qualidade da rota**: Se o OSRM retorna uma rota de 14.000 km, o sistema aceita sem questionar.

### Solução

#### 1. Remover offsets das coordenadas antes de enviar ao OSRM
Os offsets devem ser aplicados SOMENTE para exibição no mapa (frontend), nunca para cálculo de rota. No backend, enviar as coordenadas reais de cada cidade ao OSRM.

Para múltiplos clientes na mesma cidade, o OSRM deve receber as coordenadas IGUAIS — e ele vai otimizar agrupando-os naturalmente. O problema "Manaus → Manaus" desaparece.

#### 2. Implementar 2-opt local search como melhoria do greedy
O greedy nearest-neighbor é O(N²) mas produz rotas ruins. Adicionar 2-opt pós-greedy (também O(N²) mas com melhorias significativas) antes de enviar ao OSRM, especialmente para rotas grandes:

```typescript
function twoOptImprove(origin: Coords, destinations: GeocodedDestino[]): GeocodedDestino[] {
  // Classic 2-opt: try all pairs (i, k), reverse segment if improves total distance
  let improved = true;
  let route = [...destinations];
  while (improved) {
    improved = false;
    for (let i = 0; i < route.length - 1; i++) {
      for (let k = i + 1; k < route.length; k++) {
        const newRoute = twoOptSwap(route, i, k);
        if (routeDistance(origin, newRoute) < routeDistance(origin, route)) {
          route = newRoute;
          improved = true;
        }
      }
    }
  }
  return route;
}
```

Para 21 destinos isso é viável (~20.000 iterações no pior caso).

#### 3. Corrigir mapeamento de índices pós-OSRM /trip
O bug está aqui: os waypoints do OSRM /trip retornam `waypoint_index` = posição na rota ótima. O mapeamento correto é:

```typescript
// waypoints[inputIdx].waypoint_index = posição que o OSRM quer que esse ponto esteja
// Para reconstruir a ordem: criar array indexado por waypoint_index
const orderedByOsrm = new Array(waypoints.length);
waypoints.forEach((wp, inputIdx) => {
  orderedByOsrm[wp.waypoint_index] = inputIdx; // input index que deve estar nessa posição
});
// Agora orderedByOsrm[0] = qual ponto deve ser visitado primeiro, etc.
```

#### 4. Validação da distância e fallback inteligente
Se a rota retornada for > 1.5x a distância mínima possível (soma das distâncias haversine consecutivas), usar o 2-opt em vez do OSRM.

#### 5. Deduplicar cidades para OSRM, reagrupar depois
Para múltiplos clientes na mesma cidade:
- Enviar ao OSRM apenas 1 ponto por cidade única
- OSRM retorna a ordem ótima de cidades
- Após receber a ordem, expandir cada cidade para seus múltiplos clientes

Isso elimina os "Manaus → Manaus" e reduz a complexidade do TSP.

### Arquivos a editar

| Arquivo | Mudança |
|---|---|
| `supabase/functions/roteirizar/index.ts` | 1) Remover offsets de coordenadas (aplicar só no mapa); 2) Implementar 2-opt pós-greedy; 3) Deduplicar cidades para OSRM e re-expandir após; 4) Corrigir mapeamento waypoint_index→grupo |
| `src/components/dashboard/RotaMap.tsx` | Nenhuma mudança — offsets já são aplicados aqui corretamente para exibição |

### Resultado esperado

| Problema | Antes | Depois |
|---|---|---|
| "MANAUS → MANAUS" | Aparece (offset vira parada extra) | Eliminado (deduplicação) |
| Ordem ilógica em rotas longas | Greedy puro, 14.000 km | 2-opt + OSRM trip correto |
| Mapeamento de índices | Pode misturar clientes | Corrigido via deduplicação |
| Distância total absurda | 14.279 km | ~8.000-10.000 km (geograficamente correto) |
