## Problema

O Consolidado está mostrando cargas que ainda estão em **pré-carga** (ex.: Célio). Isso é incorreto — uma carga só deve aparecer no Consolidado depois que sair da pré-carga (ou seja, quando `etapa != 'pre_carga'`).

## Causa

Em `src/pages/Consolidado.tsx`, o hook `useConsolidado` busca em `carregamentos_dia` filtrando apenas por `carga_id IS NOT NULL`, sem excluir `etapa = 'pre_carga'`. Como pré-cargas já têm `carga_id` atribuído (necessário para roteirização), elas vazam para o Consolidado.

A mesma falha aparece nas duas consultas auxiliares (carry-over de hoje e data efetiva de terceirizadas).

## Correção

Adicionar `.neq("etapa", "pre_carga")` nas três queries dentro do `useConsolidado` (`src/pages/Consolidado.tsx`):

1. Query principal de `carregamentos_dia` (paginação inicial).
2. Carry-over "hoje" — extra fetch por `carga_id IN (...)` de movimentos de portaria do dia.
3. Data efetiva terceirizadas — extra fetch por `carga_id IN (...)` de saídas no intervalo.

Nas duas auxiliares (2 e 3) o filtro também evita reintroduzir pré-cargas que por algum motivo tenham movimento de portaria associado.

## Escopo

- Apenas frontend / camada de query do Consolidado.
- Não altera Expedição, PreCargas, Dashboard, Logística nem dados no banco.
- Não muda RLS nem migrações.

## Verificação

Após a mudança, abrir `/consolidado` no dia atual: cargas em pré-carga (Célio, etc.) não devem mais aparecer; cargas já fechadas continuam visíveis normalmente.
