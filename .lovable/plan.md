# Auditoria — bugs identificados

## 1. Recálculo após reordenar zera "Mais Econômica" e perde pedágios

`src/components/dashboard/RoteirizacaoDialog.tsx` linha 336: o auto-recálculo após drag-and-drop chama a edge function com `mode: "fastest"`. Isso faz com que:
- A resposta venha com `data.rotas.economica = null` → botão "Mais Econômica" vai para "indisponível".
- Mesmo a "Mais Rápida" perde os pedágios em rotas >6.000 km, porque o fallback **OSRM público** (único que aceita rotas dessa magnitude) não retorna `tollways`.

## 2. ORS não aceita >6.000 km — limitação real do provedor

Os logs confirmam `ORS HTTP 400 código 2004`. Para rotas curtas (<6.000 km) o ORS responde normalmente com pedágios. Para rotas grandes, **só o OSRM público** funciona, e ele **não tem dados de pedágio** — limitação documentada do projeto OSRM, não há como inventar.

## 3. "Não reordena de forma inteligente"

A causa: depois do botão **Roteirizar** (que faz 2-opt), o `useEffect` em `orderKey` (linha 495) dispara `runRoteirizar("preserve")` toda vez que `activeGroups` muda — inclusive quando o próprio backend reordenou via 2-opt. O `lastRoutedKeyRef` deveria proteger, mas como o estado dos `groups` é atualizado **depois** da resposta, a nova `orderKey` é diferente e dispara um `preserve` em cima da ordem otimizada — sem efeito visual nocivo, mas mascara o trabalho do 2-opt nos logs e pode confundir.

Mais importante: o **2-opt usa Haversine** (linha em reta). Para rotas continentais, a distância real OSRM/ORS pode divergir bastante e o "ótimo" Haversine não é o ótimo rodoviário. Para o caso `Goiânia → Dormentes-PE → João Pessoa-PB → Campina Grande-PB → Porto Seguro-BA → Guanambi-BA → Salvador → Belo Jardim-PE → Santa Inês-MA → Açailândia-PA → Dom Eliseu-PA → Aracaju-SE`, a sequência fica visivelmente caótica (zig-zag pelo NE).

# Correções

## A. `src/components/dashboard/RoteirizacaoDialog.tsx`

1. **Linha 336**: trocar `mode: mode === "preserve" ? "fastest" : "both"` por `mode: "both"`. Sempre pedir as duas variantes — mantém os botões "Mais Rápida"/"Mais Econômica" populados após reordenar e devolve pedágios sempre que o ORS conseguir responder.
2. **Linhas 348-369** (lógica que constrói rota local quando `data.rotas` vem `undefined`): manter como está, mas garantir que `data.rotas.economica` `null` **não sobrescreva** uma `rotaEconomica` anterior em `mode === "preserve"`. Já implementei essa proteção parcial — vou reforçá-la para `null` explícito.
3. **Linha 495-507** (`useEffect` de reroteirização automática): quando `mode === "optimize"` acaba de rodar, evitar disparar `preserve` em sequência. Solução: setar `lastRoutedKeyRef.current` para a `orderKey` esperada **antes** de aplicar `setGroups` com a ordem reordenada. Atualmente já faz isso, mas o `setGroups` muda a ordem e gera nova `orderKey` que difere.
   - Fix: dentro do bloco `if (mode === "optimize" && data.ordemOtimizada)`, calcular a `orderKey` que resultará da nova ordem e atribuir a `lastRoutedKeyRef.current` **dentro** do `setGroups` (mesmo update), evitando o re-disparo.

## B. `supabase/functions/roteirizar/index.ts` (qualidade da otimização)

1. **Substituir o 2-opt baseado em Haversine por uma matriz real de distâncias** quando o ORS estiver disponível e a quantidade de cidades for ≤ 25:
   - Chamar `https://api.openrouteservice.org/v2/matrix/driving-car` uma vez com todos os pontos para obter `durations` reais.
   - Rodar 2-opt sobre essa matriz (mesmo algoritmo, só troca a função de custo).
   - Com isso a ordem otimizada respeita estradas reais (ex.: agrupa MA/PA/TO antes de descer para BA/SE).
   - Fallback: se a matriz falhar (rede, limite ORS), manter Haversine atual.
2. **Não regredir** rotas pequenas: o `routeDistance` continua sendo usado no log e no fallback Haversine.
3. **Custo do ORS Matrix**: 1 chamada extra (~500ms) só no `mode="optimize"` quando ORS está configurado e há ≥4 cidades. Cache de matriz pode entrar depois.

## C. Limitação aceita (sem fix possível)

Para rotas que excedem 6.000 km (limite ORS), o sistema continuará usando OSRM e **não exibirá pedágios** — limitação do provedor público. Mostrar um aviso discreto no toggle "Pedágios" quando a rota ativa não tiver dados (`pedagios.length === 0` E `distanciaTotal > 6000`): texto auxiliar `"sem dados nesta faixa"` em vez do número.

# Arquivos afetados

- `src/components/dashboard/RoteirizacaoDialog.tsx` (linhas 336, 348-369, 391-428, 495-507, 904-906)
- `supabase/functions/roteirizar/index.ts` (adicionar `callOrsMatrix()` e usar no bloco `else { greedySort + twoOpt }` da linha 541)

Sem mudanças em DB, RLS, secrets.
