## Adicionar "Nome da Carga" no romaneio impresso

Exibir o nome da carga logo abaixo de "Ordem de Carga" no diálogo de impressão (`CargaPrintDialog`).

### Alterações

1. **`src/components/dashboard/CargaPrintDialog.tsx`**
   - Adicionar campo opcional `nomeCarga?: string | null` na interface `CargaPrintData`.
   - No grid de info, após o bloco "Ordem de Carga", renderizar `<div><span className="font-semibold">Nome da Carga:</span> {data.nomeCarga}</div>` quando presente.

2. **`src/pages/Index.tsx`**
   - No `handlePrintReady`/builder do `CargaPrintData`, popular `nomeCarga` a partir de `c.nome_carga` da carga selecionada (já disponível nos hooks).

3. **`src/pages/Consolidado.tsx`**
   - No builder do `CargaPrintData` (linha ~599), popular `nomeCarga` a partir do `item.nome_carga` já mapeado.

Sem mudanças de schema, hooks ou lógica de negócio — apenas apresentação.