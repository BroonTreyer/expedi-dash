## Problema

O traçado real da rota (que segue as estradas) não aparece no mapa de "Fechar Carga". Hoje, na maioria das vezes, a linha é apenas reta entre as cidades.

**Causa raiz:** A edge function `roteirizar` tenta usar o serviço OpenRouteService (ORS), mas precisa de uma chave de API (`ORS_API_KEY`) que não está configurada. Quando a chave falta, ele cai no fallback "Haversine", que devolve apenas os pontos das cidades em linha reta — sem geometria de estradas. Resultado: a `Polyline` do mapa ou some, ou aparece como traços retos.

## Solução

Usar o **OSRM público** (`router.project-osrm.org`) como camada de roteamento padrão — é gratuito, não precisa de chave, e devolve a geometria real seguindo as estradas. ORS continua como opção (se a chave estiver configurada), e Haversine vira último recurso de emergência.

### Mudanças

**1. `supabase/functions/roteirizar/index.ts`**
- Adicionar nova função `routeWithOSRM(points)` que:
  - Chama `https://router.project-osrm.org/route/v1/driving/{lng,lat;...}?overview=full&geometries=geojson&steps=false`
  - Faz parse de `routes[0].geometry.coordinates` (converte `[lng,lat]` → `[lat,lng]`)
  - Extrai `legs[].distance` e `legs[].duration` para montar `trechos` corretos
  - Usa `AbortSignal.timeout(8000)`
- Nova ordem de tentativa:
  1. ORS (se `ORS_API_KEY` definida)
  2. **OSRM público** (novo — padrão)
  3. Haversine (último recurso, marca `estimado = true`)
- Quando OSRM ou ORS funcionam, `estimado = false` e a `geometria` tem centenas de pontos seguindo as estradas.

**2. `src/components/dashboard/RotaMap.tsx`**
- A `Polyline` já existe e já recebe `routeGeometry`; apenas dois ajustes finos:
  - Aumentar `weight` para `5` e adicionar uma "casca" branca embaixo (segunda Polyline com `weight: 7, opacity: 0.6, color: white`) para o traçado se destacar sobre o mapa.
  - Garantir que o `FitBounds` inclua os pontos do `polylinePositions` quando há geometria real (hoje só usa centroides de cidades, então o zoom pode cortar curvas longas da rota).
- Pequena legenda no canto: "Rota seguindo estradas" quando `polylinePositions.length > 2`, ou "Distância estimada (linha reta)" quando `estimado=true` (esse já existe).

**3. `src/components/dashboard/RoteirizacaoDialog.tsx`**
- Nada estrutural muda. O dialog já consome `data.geometria` corretamente. Só validar que, ao reordenar manualmente (handlers `moveUp`/`moveDown`/DnD), `clearRouteGeometry` continua disparando — assim o usuário vê o traçado sumir e sabe que precisa clicar em "Roteirizar" de novo para recalcular o caminho real.

### Por que não pedir a chave do ORS

OSRM público resolve sem fricção e sem custo. Se no futuro a frota crescer e bater rate-limit do servidor demo, aí sim configuramos uma chave (ORS, Mapbox, etc.) — mas hoje não é necessário.

### Arquivos tocados

- `supabase/functions/roteirizar/index.ts` (adicionar OSRM)
- `src/components/dashboard/RotaMap.tsx` (estilo do traçado + bounds)

Posso implementar agora?