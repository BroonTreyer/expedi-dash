## Problema confirmado

O Dashboard mostra os pesos **corretos** (Fagno 27.692 kg, Sendas 29.000 kg) porque soma `peso` apenas dos itens **da query do dia**. Já a Expedição mostra **92.795 kg** porque usa o hook `usePesoPorCarga`, que **soma todas as datas** com o mesmo `carga_id`.

```
Fagno (carga_id="JR MIX"):
  30/04: 30.392 kg  ← deveria mostrar isto (ou 27.692 efetivo)
  22/04: 32.493 kg
  07/04: 29.910 kg
  TOTAL: 92.795 kg  ← bug: soma os 3 dias
```

## Causa raiz

`src/hooks/usePesoPorCarga.ts` tem dois defeitos:
1. **Não filtra por data** → soma o histórico inteiro do nome da carga.
2. **Não desconta rupturas** → soma `peso` cru, mesmo de itens com `ruptura=true`.

## Correção

### `src/hooks/usePesoPorCarga.ts`
Refatorar para receber pares `{carga_id, data}` e filtrar por ambos. Também usar `pesoEfetivo` (já existe em `@/lib/peso-utils`) para descontar rupturas — alinhando com o padrão do Consolidado.

```ts
export function usePesoPorCarga(refs: { carga_id: string; data: string }[]) {
  // queryKey baseada em refs únicos ordenados
  // SELECT carga_id, data, peso, ruptura FROM carregamentos_dia
  //   WHERE carga_id IN (...) AND data IN (...)
  // Agrega: Map<`${carga_id}::${data}`, pesoEfetivoTotal>
}
```

### `src/pages/Expedicao.tsx`
Trocar a montagem das chaves (linhas 40–48) e o consumo (linha 60) para usar a chave composta `carga_id + data`. A `data` vem da própria movimentação (`m.data_hora` → `yyyy-MM-dd`).

### `src/hooks/useCargasDiaExpedicao.ts` (defensivo)
Já filtra por `data` corretamente, então os KPIs do topo (87.919 / 46.659 / 134.578) **não devem** estar inflados pelo mesmo motivo. Vou validar com query após o fix; se ainda estiverem altos, o ajuste fino será no carry-over (que pode estar incluindo cargas de dias anteriores na soma de hoje).

## Resultado esperado

| Local | Antes | Depois |
|---|---|---|
| Card "No Pátio" — JR MIX (Fagno) | 92.795 kg | **27.692 kg** |
| Card "Chegou" — Sendas (Marisangela) | 29.000 kg | 29.000 kg (já bate por coincidência) ou peso efetivo do dia |
| KPIs do topo | a validar | a validar |

## Arquivos alterados

- `src/hooks/usePesoPorCarga.ts` — assinatura nova, filtro por data, uso de `pesoEfetivo`
- `src/pages/Expedicao.tsx` — adaptar chamada e leitura do Map
- (Eventual) `src/hooks/useCargasDiaExpedicao.ts` — só se a validação dos KPIs do topo indicar inflação

## Validação pós-fix

1. Abrir Expedição → Terceirizado e conferir o card do Fagno (deve cair para 27.692 kg).
2. Conferir KPIs do topo contra `SELECT data, SUM(pesoEfetivo)` agrupado.
3. Conferir que cargas com nome reaproveitado (JR MIX, SENDAS) não voltam a inflar.
