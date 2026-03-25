
## Problema

No "Resumo por Produto" da página Rupturas, todos os produtos mostram apenas **peso (kg)**. O Pão de Alho é contabilizado por **unidade (UNID)**, então precisa mostrar a soma de `quantidade` em vez do (ou além do) peso.

## Abordagem

Criar uma constante `PRODUTOS_POR_UNIDADE` com os nomes/códigos de produtos vendidos por unidade. No `productSummary`, incluir o campo `qtd` (soma de `quantidade`) para todos os produtos. Na renderização, exibir:
- Para produtos por UNID → `X unid` em destaque + `Y kg` secundário
- Para produtos normais → somente `Y kg`

Isso é flexível — novos produtos por unidade só precisam ser adicionados à constante.

## Arquivos a editar

### `src/lib/constants.ts`
Adicionar:
```ts
// Produtos contabilizados por unidade (não por kg)
export const PRODUTOS_POR_UNIDADE: string[] = [
  "PAO DE ALHO",
  "PÃO DE ALHO",
  // adicione mais conforme necessário
];

export function isPorUnidade(nomeProduto: string | null, codigoProduto?: string | null): boolean {
  if (!nomeProduto) return false;
  const upper = nomeProduto.toUpperCase();
  return PRODUTOS_POR_UNIDADE.some(p => upper.includes(p.toUpperCase()));
}
```

### `src/pages/Rupturas.tsx`

1. **`productSummary` useMemo** — adicionar `qtd: number` e `porUnidade: boolean` ao tipo do map:
```ts
{ codigo, nome, count, peso, qtd, cargas, porUnidade }
```
Acumular `qtd += c.quantidade ?? 0` e setar `porUnidade = isPorUnidade(c.nome_produto)`.

2. **Renderização desktop** (tabela "Resumo por Produto"):
- Coluna "Peso Total (kg)" renomeada para "Quantidade / Peso"
- Para produtos por unidade: mostrar `X unid` em badge + `Y kg` secundário
- Para os demais: mostrar só `Y kg` como antes

3. **Renderização mobile** — mesma lógica: mostrar `X unid` ou `Y kg`

4. **`printData`** — passar `qtd` e `porUnidade` no `productSummary` para o dialog de impressão

### `src/components/dashboard/RupturasPrintDialog.tsx`
- Atualizar `ProductSummaryItem` com `qtd?: number; porUnidade?: boolean`
- Na coluna "Peso (kg)", exibir `X unid` quando `porUnidade === true`, senão o peso

Sem alteração de banco — o campo `quantidade` já existe e é salvo.
