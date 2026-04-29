## Problema

Na correção anterior eu mudei o cálculo de "Faltando agora" para usar `c.peso` quando `ruptura === true`. Isso quebrou os totais corretos de produtos como Carne Moída (caiu de 11.050kg para 7.050kg), porque o `peso` da linha em ruptura nem sempre representa o peso pedido — em muitos casos ele já está zerado/reduzido, e o valor verdadeiro do que foi cortado está em `peso_original`.

O caso anterior (cód. 400, peso editado para 2.000kg) era uma **exceção isolada**, não a regra.

## Decisão

Voltar a usar `peso_original` como fonte de verdade para o que foi cortado em ruptura total — exatamente como o resto do sistema faz (`pesoNaoCarregado` em `src/lib/peso-utils.ts` já implementa essa regra).

## Mudança

**Arquivo:** `src/pages/Rupturas.tsx` (componente `FaltandoAgora`, ~linha 209 e 224)

Substituir:
```ts
const perdido = c.ruptura ? (c.peso ?? 0) : pesoNaoCarregado(c);
const qPerdida = c.ruptura
  ? (c.quantidade ?? 0)
  : Math.max(0, (c.quantidade_original ?? c.quantidade ?? 0) - (c.quantidade ?? 0));
```

Por:
```ts
const perdido = pesoNaoCarregado(c); // usa peso_original ?? peso quando ruptura
const qOriginal = c.quantidade_original ?? c.quantidade ?? 0;
const qPerdida = c.ruptura
  ? qOriginal
  : Math.max(0, qOriginal - (c.quantidade ?? 0));
```

Comportamento:
- **Ruptura total:** usa `peso_original` (com fallback para `peso` se `peso_original` for nulo). Volta a bater com o painel (11.050kg em Carne Moída).
- **Item raro com peso editado depois da ruptura:** se o usuário editou o peso pra 2.000kg e o `peso_original` continua 40.000kg, vamos exibir 40.000kg (o pedido original). Isso é o comportamento consistente com Painel/Histórico/relatórios. Se no futuro quiser que edição manual sobrescreva, tratamos como feature separada (provavelmente atualizando `peso_original` no save quando for edição intencional).
- **Ruptura parcial:** continua usando a diferença `original - atual`.

## Atualização do comentário

Trocar o comentário acima do bloco para:
```
// "Faltando agora" usa peso_original como referência do que foi cortado.
// Mesma fonte de verdade do Painel e do Histórico (pesoNaoCarregado).
```

## Não alterar

- `useCarregamentos.ts` — o refetch forçado e a lógica de realtime continuam úteis e não têm relação com esse bug.
- KPIs do Painel, Histórico, exports — já usam `pesoNaoCarregado`, estão corretos.