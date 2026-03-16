

# Paginação em Clientes/Vendedores + Coluna UF em Clientes

## Alterações

### 1. Migração: adicionar coluna `uf` à tabela `clientes`
```sql
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS uf text;
```

### 2. Popular UF a partir da cidade (via mapeamento)
Criar um mapeamento cidade→UF brasileiro em um arquivo utilitário `src/lib/cidadeUfMap.ts`. Como são ~4.760 cidades distintas, a abordagem mais prática é usar uma **backend function** (edge function) que, ao receber uma cidade, retorna o UF. Porém, como a maioria das cidades já estão cadastradas, a melhor abordagem é:

- Criar uma edge function `populate-uf` que usa uma API de localidades do IBGE (`https://servicodados.ibge.gov.br/api/v1/localidades/municipios`) para buscar todas as cidades brasileiras e seus estados, depois faz `UPDATE` em massa na tabela `clientes` para preencher o UF baseado no nome da cidade.
- Alternativamente, usar um mapeamento estático inline na migração SQL fazendo query à API do IBGE uma vez e gerando os UPDATEs.

**Abordagem escolhida**: Criar uma edge function `populate-uf` que consulta a API do IBGE, faz match pelo nome da cidade e atualiza a coluna `uf` de todos os clientes.

### 3. Paginação em `src/pages/Clientes.tsx`
- Adicionar state `page` (default 1) e constante `PAGE_SIZE = 50`
- Paginar o array `filtered` com `filtered.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE)`
- Renderizar controles de paginação abaixo da tabela usando os componentes de `src/components/ui/pagination.tsx`
- Resetar page para 1 quando `search` mudar
- Adicionar coluna "UF" na tabela e no formulário
- Exibir contagem total: "Mostrando X-Y de Z clientes"

### 4. Paginação em `src/pages/Vendedores.tsx`
- Mesma lógica: state `page`, `PAGE_SIZE = 50`, controles de paginação

### 5. Atualizar hooks
- `useClientes`: incluir `uf` nos tipos de create/update
- Form em Clientes: adicionar campo UF (somente leitura, preenchido automaticamente pela cidade, ou editável)

## Arquivos afetados
- `supabase/migrations/` — nova migração para coluna `uf`
- `supabase/functions/populate-uf/index.ts` — edge function para popular UF via API IBGE
- `src/pages/Clientes.tsx` — paginação + coluna UF
- `src/pages/Vendedores.tsx` — paginação
- `src/hooks/useClientes.ts` — suporte ao campo `uf`

