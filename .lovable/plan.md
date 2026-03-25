
## Diagnóstico completo — por que o sistema é lento e frágil

### Problema central: dependência total do Nominatim (geocoding externo + lento)

O fluxo atual tem **3 geocodings sequenciais** para a mesma rota:

1. **Edge function**: geocoda origem (1 req) + N destinos (1 req cada, 500ms de delay entre cada) = `1 + N` requests Nominatim, com `500ms × N` de espera pura
2. **RotaMap (front-end)**: mesmo tendo recebido lat/lng da edge function via `coordsCache`, quando o `geocodeCache` do módulo não tem a entrada (ex: primeiro acesso, ou módulo recarregado), o mapa chama Nominatim novamente para as cidades faltantes — mais 1200ms por cidade

**Para 5 destinos**: a edge function gasta `500ms + (5-1) × 600ms = 2.9s` **só esperando** entre geocodes. Se o OSRM /trip demorar mais 15s, o total chega a ~18s. E ainda pode falhar.

### Solução definitiva: banco de coordenadas pré-populado

A raiz do problema é que o sistema precisa descobrir as coordenadas de cada cidade **em tempo real**, o que força dependência do Nominatim com rate-limits e latência.

A solução é criar uma **tabela `geocode_cache`** no banco de dados com lat/lng por cidade+UF. As coordenadas das cidades brasileiras são dados estáticos — nunca mudam. Basta popular uma vez e a edge function consulta o banco primeiro, eliminando 100% das chamadas ao Nominatim para cidades já conhecidas.

### Plano de correção

#### 1. Criar tabela `geocode_cache` no banco
```sql
CREATE TABLE public.geocode_cache (
  cidade text NOT NULL,
  uf char(2) NOT NULL,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  PRIMARY KEY (cidade, uf)
);
-- Sem RLS, acesso público via service role na edge function
```

#### 2. Pré-popular com as principais cidades brasileiras
Na mesma migration, inserir as coordenadas das cidades que aparecem nos pedidos e as ~500 maiores cidades do Brasil — eliminando a necessidade do Nominatim para 99% dos casos.

#### 3. Refatorar `supabase/functions/roteirizar/index.ts`
**Novo fluxo**:
1. Extrair lista única de cidades dos destinos
2. Buscar todas de uma vez no banco via `SELECT lat, lng FROM geocode_cache WHERE (cidade, uf) IN (...)` — **1 query, zero latência de rate-limit**
3. Para cidades não encontradas no banco (raro): chamar Nominatim normalmente E gravar no banco para próximas vezes
4. Remover todos os `await delay(...)` do loop de geocoding — não são mais necessários pois o banco não tem rate-limit

**Resultado**: geocoding de 5 destinos: de `~3s` para `~50ms` (1 query ao banco).

#### 4. Refatorar `src/components/dashboard/RotaMap.tsx`
**Novo fluxo**:
- Quando `coordsCache` é fornecido pela edge function (que já leu do banco), usar diretamente — **zero chamadas ao Nominatim**
- Remover o loop de geocoding sequencial com delays de 1200ms
- Manter apenas fallback Nominatim para quando o mapa é aberto sem prévia roteirização (exibir marcadores antes de clicar "Roteirizar")

Para o fallback (antes de roteirizar), passar as coordenadas direto do banco via uma chamada ao Supabase, não ao Nominatim.

#### 5. Adicionar função de geocoding rápido no front-end via banco
```typescript
// Em vez de chamar Nominatim, chamar o banco diretamente:
const { data } = await supabase
  .from("geocode_cache")
  .select("cidade, uf, lat, lng")
  .in("cidade", cidades);
```

### Arquivos a editar

| Arquivo | Mudança |
|---|---|
| Migration SQL (nova) | Criar tabela `geocode_cache` com PK cidade+uf, pré-popular com principais cidades BR |
| `supabase/functions/roteirizar/index.ts` | Substituir geocoding sequencial Nominatim por query em lote ao banco; gravar novas cidades no banco; remover todos os delays |
| `src/components/dashboard/RotaMap.tsx` | Substituir loop de geocoding Nominatim por query ao banco via supabase client; manter Nominatim apenas como último fallback |
| `src/components/dashboard/RoteirizacaoDialog.tsx` | Pequena limpeza — remover estado `coordsCache` separado pois o mapa agora lê direto do banco |

### Ganho esperado

| Etapa | Antes | Depois |
|---|---|---|
| Geocoding de 5 cidades (edge fn) | 2.9s de delay puro + risco de falha | ~50ms (1 query SQL) |
| Geocoding no mapa (front-end) | 1200ms × N cidades + retries | ~50ms (1 query Supabase) |
| Marcadores faltando | Acontece frequentemente (rate-limit) | Nunca (banco não tem rate-limit) |
| Total para roteirizar 5 destinos | ~15-20s | ~2-4s (só OSRM) |
