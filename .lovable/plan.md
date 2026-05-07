## Contexto

`router.project-osrm.org` é o servidor público do **Project-OSRM/osrm-backend** (do GitHub que você indicou). Ele é o que já está sendo usado como fallback hoje. A diferença é que estamos chamando ele **só para uma rota única**, sem pedir alternativas — por isso só conseguimos preencher uma das duas variantes.

A OSRM API pública aceita o parâmetro `alternatives=true` (ou `alternatives=N`) que devolve até 3 rotas diferentes na mesma chamada. Podemos usar essas alternativas para popular os dois botões.

Limites do OSRM público (úteis saber): sem limite rígido de distância, ~3000 coordenadas por requisição, sem perfil "shortest" nativo (só "fastest"), e **não devolve dados de pedágio**.

## Solução

Reformular a edge function `roteirizar` para usar **OSRM como fonte primária das duas variantes** quando o ORS não puder atender (rota > 6.000 km ou ORS fora do ar), preservando ORS para rotas pequenas/médias onde ele tem vantagem (pedágios, perfil shortest real).

### Mudanças em `supabase/functions/roteirizar/index.ts`

1. **Nova função `callOsrmAlternatives()`**: chama o OSRM público com:
   ```
   /route/v1/driving/{coords}?overview=full&geometries=geojson&alternatives=2&steps=false&annotations=false
   ```
   Retorna um array de até 3 variantes (cada uma com `geometry`, `distanciaTotal`, `duracaoMin`, `trechos`).

2. **Nova função `buildOsrmVariants(routes)`**: a partir das alternativas:
   - **Mais Rápida** = a rota com menor `duration` (OSRM já retorna as rotas ordenadas por tempo, então é normalmente `routes[0]`).
   - **Mais Econômica** = a rota com menor `distance` (frequentemente uma alternativa diferente; se só vier uma rota e for igual à rápida, a econômica fica `null` e a UI mostra "indisponível" só nesse caso específico).
   - `pedagios: []` (OSRM público não fornece). UI já lida com isso.

3. **Novo fluxo de variantes** (substitui o bloco `Promise.all([callOrs("fastest"), callOrs("shortest")])` atual):
   ```text
   1. Tenta ORS fastest + ORS shortest em paralelo (como hoje).
   2. Se AMBOS retornarem null (caso de rota > 6000km),
      chama callOsrmAlternatives() uma única vez.
      Aplica buildOsrmVariants() para preencher vFast / vEcon.
   3. Se mesmo o OSRM falhar, mantém o fallback Haversine atual (rota única, sem variantes).
   ```

4. **Resposta**: o shape de `data.rotas.{rapida,economica}` continua idêntico — frontend não precisa de alteração nenhuma.

5. **Cache**: gravar as variantes do OSRM no `route_cache` igualzinho às do ORS (chave inclui `pref` + `mode`), pra evitar nova chamada no próximo clique.

6. **Telemetria**: adicionar logs `[roteirizar] OSRM alternativas: N rotas (rápida=Xkm/Ymin, econômica=Xkm/Ymin)` para conseguirmos validar pelos logs depois.

### Frontend

Nada muda. O `RoteirizacaoDialog.tsx` já consome `data.rotas.rapida` e `data.rotas.economica` e habilita os botões automaticamente quando vêm preenchidos. O badge "Distância estimada" continua aparecendo só quando cair no Haversine.

### O que NÃO muda

- ORS continua sendo o provedor preferido para rotas pequenas/médias (mantém pedágios reais).
- Nenhuma alteração em banco, RLS, migrations, frontend ou config.toml.
- Nenhuma nova secret necessária — o OSRM público é gratuito e sem chave.

## Limitação conhecida (transparente)

Para rotas que só foram resolvidas via OSRM (gigantes como a sua de ~9.700 km):
- Rápida e Econômica podem coincidir se o OSRM só devolver 1 rota razoável.
- Não vai aparecer marcação de pedágios nessas rotas (o ícone do toggle 💰/🛣 pedágios fica vazio).

## Arquivo afetado

- `supabase/functions/roteirizar/index.ts` (única alteração de código)
