## Objetivo

1. Oferecer **rotas alternativas** (Mais Rápida × Mais Econômica) na tela de **Roteirizar** e **Fechar Carga**, com seleção pelo usuário.
2. Marcar **pedágios** ao longo do trajeto no mapa.
3. Mostrar o **preço do frete** em "Fechar Carga", calculado pela tabela de frete cadastrada (por cidade/UF/cliente e tipo de caminhão).

> Observação honesta: **balanças (postos de pesagem)** não são fornecidos por nenhuma API gratuita usada hoje (ORS/OSRM). Vou marcar **apenas pedágios** (que o ORS retorna em `extra_info=tollways`). Se quiser balanças no futuro, precisaríamos de uma fonte paga (TollGuru/HERE) — posso planejar depois.

---

## 1. Edge function `roteirizar` — alternativas + pedágios

Hoje retornamos uma única rota ORS `preference: "recommended"`. Vou alterar para:

- Aceitar novo parâmetro `mode: "fastest" | "cheapest" | "both"` (default `"both"`).
- Quando `both`, executar **duas chamadas ORS em paralelo**:
  - `preference: "fastest"` → rota Mais Rápida
  - `preference: "shortest"` → rota Mais Econômica (menos km = menos combustível/pedágio)
- Em cada chamada ORS, adicionar `extra_info: ["tollways"]` para receber os trechos com pedágio.
- A geometria dos pedágios é extraída do `extras.tollways.values` (índices de waypoints da geometria onde `value=1`). Convertemos isso em **lista de pontos `[lat,lng]` de pedágio** para o frontend desenhar marcadores.
- Resposta passa a conter:
  ```ts
  {
    rotas: {
      rapida:    { geometria, distanciaTotal, duracaoMin, trechos, pedagios: [[lat,lng], ...], ordemOtimizada },
      economica: { geometria, distanciaTotal, duracaoMin, trechos, pedagios: [...],            ordemOtimizada },
    },
    estimado, origemLat, origemLng, ...
  }
  ```
- Cache (`route_cache`): adicionar coluna `mode` na cache_key para não conflitar; armazenar JSON com ambas variantes ou criar 2 entradas (`...:FAST` e `...:ECON`). Vou usar 2 entradas — mais simples e mantém schema atual.
- OSRM/Haversine fallbacks continuam (uma rota só); nesses casos `rotas.economica = rotas.rapida`.

## 2. `RotaMap.tsx` — alternativas e marcadores de pedágio

- Aceitar nova prop `pedagios?: [number, number][]`.
- Renderizar marcadores de pedágio com ícone próprio (Leaflet `divIcon` com símbolo "$" / cor laranja) e tooltip "Pedágio".
- Continuar suportando uma única `geometry` por vez (a selecionada).

## 3. `RoteirizacaoDialog.tsx` — toggle Rápida × Econômica

- Após chamar `roteirizar`, guardar `rotas.rapida` e `rotas.economica` em estado.
- Adicionar um **Toggle/SegmentedControl** no topo do mapa: "Mais Rápida" (default) | "Mais Econômica".
- Mostrar resumo lado a lado:
  - Rápida: `XX km · YY min · N pedágios`
  - Econômica: `XX km · YY min · N pedágios`
- Ao trocar, atualizar a geometria + pedágios passados ao `RotaMap`.
- Quando o usuário reordena manualmente, manter o comportamento atual (recalcular preservando ordem) — neste caso retorna apenas 1 rota (a do usuário) e o toggle fica desabilitado.

## 4. `FechamentoLoteDialog.tsx` — alternativas + frete

### 4a. Toggle de alternativas
- Mesma UX de toggle Rápida × Econômica usada no Roteirizar.
- O `tipo_caminhao` da carga influencia preço (não a rota — ORS não diferencia).

### 4b. Preço do frete pela tabela
- Buscar `tabelas_frete_itens` (já existe em `useTabelasFrete`) e indexar por `(uf, cidade, codigo_cliente?)`.
- Para cada destino da carga (do `roteirizacao.ordemOtimizada` ou da lista de pedidos), aplicar a regra cascata existente em `useGastosVendedor`:
  1. match por cliente + cidade + UF
  2. match por cidade + UF
  3. match por UF (cidade null)
- Selecionar coluna `valor_kg_bitruck` ou `valor_kg_carreta` conforme `tipo_caminhao` da carga (`bitruck` → bitruck; demais → carreta — manter compatível com `useGastosVendedor`).
- `frete_destino = peso_destino × valor_kg`
- `frete_total = soma de todos destinos`
- Exibir abaixo do resumo de KM/Custo Combustível um novo card:
  - **Frete Tabela:** R$ X.XXX,XX
  - Detalhe expandível por destino (cidade, peso, R$/kg, subtotal)
  - Aviso visual quando algum destino estiver **sem tarifa** ou em **conflito** entre tabelas (mesmo padrão do hook existente).

> Não vou persistir o frete em `rotas_executadas` agora — só exibir. Se quiser salvar, peço confirmação depois.

---

## Detalhes técnicos

**ORS `extra_info` para pedágios:** o endpoint `directions/driving-car/geojson` aceita `extra_info: ["tollways"]`. Retorna `properties.extras.tollways.values = [[startIdx, endIdx, value], ...]` referenciando índices da `geometry.coordinates`. Convertemos cada `startIdx` (onde `value === 1`) em `[lat, lng]` da geometria → marcador.

**Rate limit ORS:** 2 chamadas em paralelo por roteirização. Plano free do ORS aceita 40/min, então OK. Mantemos `AbortSignal.timeout(8000)`.

**Cache:** `cache_key` ganha sufixo `:FAST` ou `:ECON`. Funções `readRouteCache`/`writeRouteCache` aceitam o sufixo. Geometria de pedágio entra como coluna nova `pedagios jsonb` em `route_cache` (migration).

**Migration necessária:**
```sql
alter table public.route_cache
  add column if not exists pedagios jsonb default '[]'::jsonb,
  add column if not exists duracao_min_real numeric;
```

**Frete (frontend):** novo helper `src/lib/calcularFreteTabela.ts` que recebe `{ destinos: [{cidade, uf, peso, codigo_cliente}], tipo_caminhao, itensTabela }` e devolve `{ total, detalhes, semTarifa, conflitos }`. Reuso da lógica de cascata do `useGastosVendedor` extraída para função pura.

**Compatibilidade:** mantenho `geometria/distanciaTotal/trechos/ordemOtimizada` no nível raiz da resposta (apontando para `rotas.rapida`) para não quebrar consumidores antigos enquanto a UI migra.

---

## Arquivos alterados

- `supabase/functions/roteirizar/index.ts` — alternativas, pedágios, cache.
- nova migration — colunas `pedagios`, `duracao_min_real` em `route_cache`.
- `src/components/dashboard/RotaMap.tsx` — prop `pedagios`, marcadores.
- `src/components/dashboard/RoteirizacaoDialog.tsx` — toggle + estado das duas rotas.
- `src/components/dashboard/FechamentoLoteDialog.tsx` — toggle + card de frete.
- `src/lib/calcularFreteTabela.ts` — novo (helper puro).
- `src/hooks/useGastosVendedor.ts` — refator mínimo: extrair função de cascata para o helper acima (sem mudar comportamento).
