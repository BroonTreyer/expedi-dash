
## Diagnóstico

Print mostra que muitos clientes têm CEP válido (ex: 72940-000, 73795-000, 79920-000) mas a coluna **Cidade** continua vazia ("—"). UF foi preenchida em quase todos. Sintomas + análise do código:

1. **Função sai cedo demais**: o critério de fim no frontend é `data.done === true`, mas a edge function só retorna `done:true` quando `clientes.length === 0` na query inicial. A query filtra `.not("cep", "is", null)` — ou seja, enquanto **existir qualquer cliente com CEP**, ela retorna `done:false` mesmo que nenhum esteja sendo atualizado naquele lote. O loop do frontend tem cap de 500 iterações por worker, mas o cursor avança por CEP — funciona, exceto quando…

2. **Problema real — cursor pula clientes não-atualizados**: a função busca `select id, cep, cidade, uf ... order by cep limit CHUNK*5`, normaliza, e processa só os primeiros 1000 CEPs únicos. Mas quando consulta o cache (`cep_cache`), os CEPs já cacheados retornam imediatamente. Aí o agrupamento `if (c.cidade === info.cidade && c.uf === info.uf) continue;` pula clientes já corretos. **Mas se a UF do cliente já bate com o cache e a cidade é null, o código compara `null === "Abadiânia"` → false → entra no grupo → atualiza**. Isso deveria funcionar.

3. **Bug provável — UF preenchida via `cep-uf.ts` em outro fluxo**: existem casos onde a UF foi inferida via faixa de CEP (lib local) mas a cidade nunca foi resolvida. ViaCEP retorna ambos. Esses CEPs **deveriam** ser corrigidos. Verificar via SQL se estão no `cep_cache`:
   - Se SIM no cache mas cidade do cliente null → bug no agrupamento/update da function
   - Se NÃO no cache → ViaCEP falhou (timeout 2.5s curto demais, ou rate limit) e nada foi gravado

4. **Suspeito #1 — timeout de 2.5s**: ViaCEP tem latência variável; em concurrency 50 muitos requests batem no timeout, retornam `null`, e o CEP **não vai pro cache** (só grava `newlyResolved`). Próxima execução refaz a chamada e falha de novo. Resultado: CEPs "difíceis" nunca resolvem.

5. **Suspeito #2 — cursor não retry**: como o cursor avança por `gt: lastCep`, CEPs que falharam num lote **nunca mais são tentados** dentro da mesma execução do botão. Só re-clicando.

## Plano

### 1. Investigar primeiro (1 query)
Rodar SQL pra confirmar a hipótese:
- Quantos clientes têm `cep` válido + `cidade` null
- Desses CEPs, quantos estão no `cep_cache`
- Diferenciar: "cache existe mas update não rolou" vs "cache nunca foi populado"

### 2. Corrigir edge function `enrich-clientes-viacep`
- **Aumentar timeout ViaCEP** de 2.5s → 6s (CEPs lentos do interior precisam)
- **Retry simples**: se ViaCEP falhar 1x, tentar mais 1x antes de desistir
- **Fallback BrasilAPI**: se ViaCEP falhar/timeout, tentar `https://brasilapi.com.br/api/cep/v2/{cep}` (API alternativa, mesma cobertura)
- **Reduzir concorrência** de 50 → 25 (50 estava saturando ViaCEP e causando timeouts em massa)
- **Logar CEPs falhados** no response (`failed_ceps: [...]`) para debug

### 3. Botão "Reprocessar não resolvidos" no frontend
Novo modo da função: quando chamada com `{ only_missing: true }`, busca **só clientes com `cidade IS NULL` e `cep` válido**, ignorando cursor. Loop até zerar. Garante que clientes pulados em execuções anteriores sejam retentados.

Substituir o botão atual por dois:
- **"Atualizar via CEP"** — comportamento atual (varre tudo, rápido com cache)
- **"Reprocessar pendentes"** — só os que ficaram com cidade vazia (mais lento mas exaustivo)

### 4. Sem mudanças
- Schema, RLS, `cep_cache`, `sync_clients_to_orders`, hooks

## Arquivos
- ✏️ `supabase/functions/enrich-clientes-viacep/index.ts` — timeout 6s, retry+fallback BrasilAPI, concorrência 25, modo `only_missing`, reportar `failed_ceps`
- ✏️ `src/pages/Clientes.tsx` — novo botão "Reprocessar pendentes" que chama com `only_missing: true`
