## Objetivo

Adicionar um campo de busca na aba **Adiantamentos** dentro da página **Logística**, permitindo filtrar registros por transportadora/motorista, nº de OC/carga, nº de CT-e ou valor.

## Alterações

### 1. Hook `useAdiantamentos` — incluir CT-es vinculados

`src/hooks/useAdiantamentos.ts`

- Alterar a query do `useAdiantamentos` para trazer também os CT-es vinculados:
  ```ts
  .select("*, adiantamentos_frete_ctes(cte_id, ctes_dacte(numero_cte))")
  ```
- Adicionar campo opcional `cteNumbers?: string[]` no tipo `Adiantamento` (ou criar tipo estendido).
- Mapear os números de CT-e no retorno do hook.

### 2. Componente `AdiantamentosTab` — UI e filtro

`src/components/logistica/AdiantamentosTab.tsx`

- Adicionar estado `searchTerm` (string) com debounce de 300ms.
- Inserir um `<Input placeholder="Buscar..." />` no topo da aba, alinhado à esquerda, com ícone de lupa (`Search`) e botão de limpar (`X`), seguindo o padrão da aba CTE (linha ~180 de `CtesDacteTab.tsx`).
- Criar função `matchesSearch(a: Adiantamento, term: string)` que retorna `true` se o termo (case-insensitive, sem acentos) for encontrado em:
  - `transportadora`
  - `ordem_carga`
  - `numero` (nº do adiantamento)
  - `cteNumbers` (números dos CT-es vinculados)
  - `valor_adiantamento` (comparar como número formatado em BRL, ex: `R$ 1.234,56`)
- Aplicar o filtro em cada uma das 4 listas: pendentes, pagos, quitados, e CT-es disponíveis (aba "Montar Lote").
- Atualizar os contadores das abas (`Pendentes ({N})`, etc.) para refletirem o resultado filtrado.

## Validação

- Digitar o nome de uma transportadora: aparecem apenas os registros dela.
- Digitar um nº de OC: aparece o registro vinculado.
- Digitar um nº de CT-e: aparece o adiantamento que contém aquele CT-e.
- Digitar um valor (ex: "1500"): aparecem adiantamentos com valor correspondente.
- Limpar o campo: volta a exibir todos os registros.
