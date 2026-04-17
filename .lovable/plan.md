
## Diagnóstico

Hoje cada chamada da edge function processa só 300 CEPs únicos e o frontend chama em loop sequencial. Para 32k clientes com muitos CEPs únicos, isso vira ~100+ chamadas sequenciais de ~10s cada.

Gargalos:
1. **CHUNK pequeno (300)** — função aguenta mais
2. **Concorrência baixa (20)** no fetch ViaCEP — pode subir bem
3. **Updates 1-a-1** no banco (50 paralelos via `.eq("id")`) — lento
4. **Loop sequencial no frontend** — não aproveita paralelismo

## Plano

### 1. Edge function mais agressiva
- `CHUNK = 1000` CEPs únicos por chamada
- `concurrency = 50` no fetch ViaCEP (API aguenta tranquilo)
- Substituir updates 1-a-1 por **um único UPSERT em lote** por (cidade, uf): agrupar clientes por par `cidade+uf` resolvido e fazer `update ... in (ids)` — 1 query por grupo ao invés de N queries
- Timeout do fetch reduzido de 4s → 2.5s (CEPs lentos não travam o batch)

### 2. Cache de CEPs já resolvidos
Criar tabela `cep_cache (cep text PK, cidade text, uf text, updated_at)`. Antes de chamar ViaCEP, consultar cache. CEPs repetidos entre execuções/clientes são resolvidos instantaneamente. Após resolver via ViaCEP, gravar no cache.

### 3. Paralelismo no frontend
Em vez de loop sequencial com cursor, disparar **3 invocações paralelas** da edge function com cursores intercalados (offset por hash do CEP, ou simplesmente 3 ranges fixos de CEP: `< "30000000"`, `>= "30000000" AND < "60000000"`, `>= "60000000"`). Reduz tempo total ~3x.

Para isso a function aceita `cep_min` e `cep_max` opcionais além do cursor.

### 4. Feedback de progresso melhor
Toast mostra: "X/3 lotes • Y clientes atualizados • Z% concluído" em tempo real conforme cada worker avança.

### Sem mudanças
- `sync_clients_to_orders` (roda 1x ao final)
- Schema de `clientes`, RLS, hooks

## Arquivos
- 🆕 migration — `CREATE TABLE cep_cache (cep text PRIMARY KEY, cidade text, uf text, updated_at timestamptz DEFAULT now())` + RLS para authenticated
- ✏️ `supabase/functions/enrich-clientes-viacep/index.ts` — CHUNK 1000, concurrency 50, cache lookup/write, updates em lote por (cidade,uf), aceitar `cep_min`/`cep_max`
- ✏️ `src/pages/Clientes.tsx` — `handleEnrichViaCep` dispara 3 workers paralelos por faixa de CEP, agrega progresso
