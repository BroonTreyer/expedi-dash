## Problema

Pedidos que já estão em **pré-carga** ou em **carga fechada** estão aparecendo na lista "Pedidos" do painel principal. Exemplo: pedido #94 (WV COSTA DISTRIBUIDORA), data 19/05, em carga fechada **ELVIS MARABA**, aparece no painel do dia 21/05.

## Causa

Em `src/pages/Index.tsx`, dentro de `filtered` (≈ linhas 143-168):

```ts
const ehCarryOver = !!c.data && c.data < hojeStr && c.status !== "Carregado";
if (!ehCarryOver) {
  if (showLogistica && c.etapa !== "logistica") return false;
  if (!showLogistica && c.etapa === "logistica") return false;
}
```

Quando `ehCarryOver = true`, a regra de **carry-over** ignora o toggle de etapa e exibe o pedido. Pedidos em **carga fechada** (`etapa = "logistica"`) com status diferente de `"Carregado"` (ex.: "Pronto para carregar") caem nessa condição quando a `data` é anterior a hoje, e por isso vazam para o painel.

Pré-cargas (`etapa = "pre_carga"`) já são removidas na linha 147 — então o vazamento ocorre só com cargas fechadas atrasadas.

## Correção (somente front-end, escopo mínimo)

Alterar apenas `src/pages/Index.tsx`, função `filtered`:

1. Mover a exclusão de `etapa === "logistica"` para **antes** da regra de carry-over, junto com a exclusão de `pre_carga`, respeitando o toggle `showLogistica`:
   ```ts
   if (c.etapa === "pre_carga") return false;
   // Cargas fechadas só aparecem com o toggle de logística ativo —
   // nunca via carry-over, pois já moram em Consolidado/Expedição.
   if (c.etapa === "logistica" && !showLogistica) return false;
   ```
2. Remover as duas linhas equivalentes de dentro do bloco `if (!ehCarryOver)`, mantendo apenas o que ainda fizer sentido (o caso `showLogistica && c.etapa !== "logistica"` continua aplicável ao toggle quando ligado).
3. Resultado: pedidos em `pre_carga` e em `logistica` **nunca** aparecem como linha de pedido no painel — só via toggle de logística (quando explicitamente ativado) ou nas telas dedicadas (Pré-cargas, Consolidado, Expedição).

## Fora de escopo

- Não mexer em `kpiSource`, que já ignora carry-over.
- Não mudar `PreCargasPanel`, Consolidado ou Expedição.
- Não tocar em hooks, RLS, schema ou triggers.
- Comportamento de carry-over para `etapa = "vendas"` (pedidos realmente pendentes) permanece inalterado.
