
## Diagnóstico

**Problema:** Quando o usuário desmarca um destino (exclui do `excludedGroupKeys`), o campo `g.ordem` dos grupos restantes **não é recalculado**. Os grupos mantêm os números originais (ex: 1, 2, 3, 4). Se o destino 1 é excluído, `activeGroups` passa a ter grupos com `ordem = 2, 3, 4` — mas o mapa renderiza os marcadores usando `p.ordem` diretamente (`createMarkerIcon(p.ordem, type)`). Resultado: o marcador mostra **2, 3, 4** em vez de **1, 2, 3**.

**Causa raiz em `RotaMap.tsx` linha 446:**
```ts
icon={createMarkerIcon(p.ordem, type)}  // usa ordem absoluta, não posição relativa
```

**Causa raiz em `RoteirizacaoDialog.tsx`:** `rotaDestinos` passa `g.ordem` sem renumerar para os grupos ativos:
```ts
.map((g) => ({ ordem: g.ordem, ... }))  // ordem original, não resequenciada
```

## Solução

**Dois pontos a corrigir:**

### 1. `RoteirizacaoDialog.tsx` — renumerar `rotaDestinos` pela posição ativa

No `useMemo` de `rotaDestinos` (linha 361–366), substituir `g.ordem` pelo índice sequencial dos grupos **ativos** (posição no array filtrado + 1):

```ts
const rotaDestinos = useMemo(
  () => activeGroups
    .filter((g) => g.cidade && g.uf)
    .map((g, i) => ({ ordem: i + 1, cliente: g.nomeCliente ?? "Sem cliente", cidade: g.cidade!, uf: g.uf! })),
  [activeGroups]
);
```

Isso garante que o mapa sempre recebe `ordem: 1, 2, 3...` contíguo, independente de quais grupos estão excluídos.

### 2. `RoteirizacaoDialog.tsx` — exibir número correto no card

O número exibido no `Input` dentro de `SortableDestinationCard` usa `group.ordem`. Para grupos excluídos não há impacto visual (card fica opaco), mas para grupos ativos a numeração deve refletir a posição na lista ativa.

O `group.ordem` já é atualizado pelo `renumber()` quando o usuário reordena manualmente. **Porém, ao marcar/desmarcar** (toggle exclusão), o `renumber` não é chamado — os grupos mantêm a `ordem` anterior.

**Correção:** Chamar `renumber` nos grupos ativos via um segundo memo para exibição, **sem** alterar o estado `groups` (para não perturbar a lógica de DnD que usa `groups` completo). Na verdade, a forma mais simples é: ao calcular `rotaDestinos`, usar o índice sequencial `i + 1` (já feito acima). Nos cards, o número exibido é `group.ordem` que vem do estado `groups` — devemos mostrar a posição ativa ao invés da `ordem` bruta.

**Implementação:** Passar ao `SortableDestinationCard` um prop `displayOrder` calculado a partir da posição do grupo nos `activeGroups` (para grupos ativos) ou mantendo o número original (para excluídos, já em opaco):

```ts
// no render dos cards:
const activeOrderMap = useMemo(() => {
  const map = new Map<string, number>();
  activeGroups.forEach((g, i) => map.set(groupKey(g), i + 1));
  return map;
}, [activeGroups]);
```

E passar `displayOrder={activeOrderMap.get(groupKey(group)) ?? group.ordem}` para o card, que o usa no `Input` e no `localOrder`.

## Arquivos a Editar

| Arquivo | Mudança |
|---|---|
| `src/components/dashboard/RoteirizacaoDialog.tsx` | 1) `rotaDestinos` usa `i+1` ao invés de `g.ordem`; 2) Criar `activeOrderMap` memo; 3) Passar `displayOrder` ao card; 4) Card usa `displayOrder` no Input |
| `src/components/dashboard/RotaMap.tsx` | Nenhuma mudança necessária — o mapa já usa `p.ordem` que agora virá correto |
