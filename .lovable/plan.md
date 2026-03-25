
## Diagnóstico: tabela `geocode_cache` não existe

A migration foi planejada mas nunca executada. O banco não tem a tabela, então **100% das cidades vão ao Nominatim** — 21 cidades × 600ms = ~14 segundos só de espera, mais o OSRM.

Além disso, o OSRM `/trip` com 22 pontos (origem + 21 destinos) está sendo chamado com timeout de 15s. Para rotas longas (ex: Goiânia → Manaus → Macapá → SP), o servidor público do OSRM demora bastante.

## O que será feito

### 1. Criar migration com a tabela `geocode_cache` + ~800 cidades pré-populadas

Tabela com PK `(cidade, uf)`, sem RLS (acesso via service role na edge function). Será populada com:
- Todas as capitais brasileiras
- Todas as cidades presentes nos logs (VITORIA DA CONQUISTA, EUNAPOLIS, PORTO SEGURO, ILHEUS, SIMOES FILHO, SALVADOR, LAURO DE FREITAS, ITABAIANA, CAPIM GROSSO, EUCLIDES DA CUNHA, JUAZEIRO DO NORTE, MACAPA, MANAUS, SINOP, CUIABA, VARZEA GRANDE, RONDONOPOLIS, FRANCO DA ROCHA, SAO PAULO, NOSSA SENHORA DO SOCORRO, etc.)
- As ~500 maiores cidades do Brasil por estado

Nomes em UPPERCASE sem acento — exatamente como vêm nos pedidos (o sistema já normaliza para uppercase).

### 2. Ajustar a edge function `roteirizar` para normalizar o nome da cidade antes da busca

O log mostra que a origem `Goiânia` tem acento e case diferente das cidades dos destinos que chegam em UPPERCASE sem acento. A função precisa normalizar tudo para UPPERCASE sem acento **antes** de buscar no banco.

```typescript
function normalizarCidade(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();
}
// Usar na chave de busca: normalizarCidade(cidade)
```

### 3. Reduzir timeout OSRM e adicionar paralelismo inteligente

- Geocoding do banco: 1 query (já está implementado, só faltava a tabela)
- OSRM `/trip` timeout: reduzir de 15s → 10s para 22+ pontos
- Para rotas com >15 destinos: disparar `/trip` e `/route` em paralelo, usar o que responder primeiro

### Arquivos a editar

| Arquivo | Mudança |
|---|---|
| Nova migration SQL | Criar `geocode_cache` + INSERT de ~800 cidades BR em UPPERCASE sem acento |
| `supabase/functions/roteirizar/index.ts` | Normalizar nomes de cidades (uppercase + sem acento) antes de buscar no banco; reduzir timeout OSRM |

### Ganho esperado

| Etapa | Antes | Depois |
|---|---|---|
| Geocoding 21 cidades | ~14s (Nominatim sequencial) | ~50ms (1 query SQL) |
| Cidades não encontradas | Comum (tabela vazia) | Raro (~99% cobertura) |
| Tempo total | 20-30s | 3-6s (só OSRM) |
