

## Diagnóstico dos Dois Problemas

### Problema 1 — Mapa e lista com "inteligências diferentes"

**Causa raiz:** O `rotaDestinos` (passado ao mapa) é derivado de `activeGroups` usando `g.ordem`, mas o mapa renderiza os marcadores com os números vindos do campo `ordem` de cada grupo. **O problema está no mapeamento de volta do `ordemOtimizada` para os grupos no front-end (linhas 313–341 do dialog):**

```ts
// CÓDIGO ATUAL — BUGADO
const byIdx = activeGroups[opt.originalIndex]; // ← usa índice absoluto do array `destinos`
                                                //   enviado à edge function
```

O `destinosParaRoteirizar` é construído a partir de `activeGroups.filter(g => g.cidade && g.uf)` — é um **subconjunto** de `activeGroups`. Mas `opt.originalIndex` na resposta vem da posição no array original `destinos` enviado à edge function (que é esse subconjunto filtrado). Se algum grupo está sem cidade/uf, os índices ficam desalinhados. **Porém o bug principal é outro:**

O `ordemOtimizada` retornado pela edge function expande os `cityGroups` de volta para membros individuais (linhas 574–579 do backend). Ou seja, quando duas cidades têm múltiplos clientes, `ordemOtimizada` tem **mais entradas que `activeGroups`**. O loop `for (const opt of data.ordemOtimizada)` tenta mapear de volta via `activeGroups[opt.originalIndex]`, mas `opt.originalIndex` aponta para o índice dentro do array `destinos` (que é o subconjunto com cidade/uf), não para o índice em `activeGroups`.

**Resultado:** A lista de destinos (cards) mostra uma ordem, mas o mapa usa a `ordem` que veio nos `ordemOtimizada` para renderizar os marcadores numerados — e os dois podem divergir porque o remapeamento no front está incorreto.

**Correção:** O front-end deve reordenar os `groups` pela ordem que a edge function retornou, usando `cidade+uf` como chave de correspondência (que é o único dado compartilhado entre front e back), não `originalIndex`.

---

### Problema 2 — Clicar "Roteirizar" novamente muda os números dos marcadores

**Causa raiz:** O `autoRoute` dispara na abertura do dialog e chama `handleRoteirizar`. O botão "Roteirizar" também chama `handleRoteirizar`. Em ambos os casos, a edge function recebe `destinosParaRoteirizar` que é construído a partir do **estado atual de `activeGroups`** — mas após a primeira roteirização, os `groups` já foram reordenados. Na segunda chamada:

1. Os `destinos` enviados já estão em ordem otimizada
2. O OSRM `/trip` pode retornar uma **ordem diferente** (waypoints com índices diferentes) porque o input já é "quase ótimo" mas o OSRM pode escolher uma ordem marginalmente diferente de waypoints
3. O remapeamento `activeGroups[opt.originalIndex]` fica errado porque `opt.originalIndex` reflete a posição no array enviado (já reordenado), e o resultado `orderedGroups` do backend usa `optimizedGroups` que passou por `greedySort` + `2-opt` + `OSRM trip` — que pode divergir da ordem atual

**Solução:** Quando o usuário clica "Roteirizar" **após** uma rota já existente, deve-se usar o mesmo mecanismo de reordenamento por `cidade+uf`, e garantir que a correspondência seja estável. O problema secundário é que `clearRouteGeometry` não é chamado no início de `handleRoteirizar` de forma síncrona antes do `setIsRouting` — mas isso já está sendo feito (linhas 253–255). O verdadeiro problema é o **remapeamento incorreto** descrito acima.

---

## O Que Mudar

### `src/components/dashboard/RoteirizacaoDialog.tsx`

**Corrigir o remapeamento de `ordemOtimizada` para `groups` (linhas 293–341):**

O loop atual usa `activeGroups[opt.originalIndex]` como índice direto. Isso está errado quando:
- Há grupos sem cidade/uf (filtrados fora de `destinosParaRoteirizar`)  
- Há múltiplos clientes na mesma cidade (a edge function agrupa por cidade e expande de volta, mas com `originalIndex` apontando para o índice no input `destinos`, que é o subconjunto)

**Nova lógica:**
```ts
// 1. Construir lookup: "CIDADE,UF" → grupo (dos activeGroups com cidade)
// 2. Para cada opt em ordemOtimizada, buscar pelo "CIDADE,UF" normalizado
// 3. Deduplicate: pegar cada grupo apenas uma vez (primeira ocorrência na ordemOtimizada)
// 4. Appender grupos excluídos ou sem coords ao final
```

Isso garante que:
- A lista de destinos (cards) e o mapa sempre mostram os mesmos números
- Clicar "Roteirizar" novamente produz o mesmo resultado (idempotente para rotas já ótimas)

**Arquivo:** `src/components/dashboard/RoteirizacaoDialog.tsx`  
**Linhas afetadas:** 293–341 (o bloco `setGroups` dentro do `handleRoteirizar`)

---

## Implementação

```ts
// NOVA lógica de remapeamento (substituir bloco setGroups em handleRoteirizar):
setGroups((prev) => {
  // Build lookup by normalized cidade+uf → first matching group not yet seen
  // This is the only reliable key shared between front-end groups and backend ordemOtimizada
  const byCidadeUf = new Map<string, RotaGroup[]>();
  for (const g of prev) {
    if (!g.cidade || !g.uf) continue;
    const k = `${normCity(g.cidade)},${g.uf.toUpperCase().trim()}`;
    if (!byCidadeUf.has(k)) byCidadeUf.set(k, []);
    byCidadeUf.get(k)!.push(g);
  }
  // Usage counters to handle multiple groups in same city
  const usedCount = new Map<string, number>();

  const newOrder: RotaGroup[] = [];
  const seen = new Set<RotaGroup>();

  for (const opt of data.ordemOtimizada) {
    const k = `${normCity(opt.cidade)},${opt.uf.toUpperCase().trim()}`;
    const candidates = byCidadeUf.get(k) ?? [];
    const used = usedCount.get(k) ?? 0;
    const found = candidates[used];
    if (found && !seen.has(found)) {
      newOrder.push(found);
      seen.add(found);
      usedCount.set(k, used + 1);
    }
  }

  // Append any groups not matched (excluded or missing coords)
  for (const g of prev) {
    if (!seen.has(g)) newOrder.push(g);
  }

  return renumber(newOrder);
});
```

Essa lógica é a fonte única da verdade: o backend decide a ordem, o front aplica diretamente por `cidade+uf`, sem depender de `originalIndex` (que é frágil).

---

## Arquivos a Editar

| Arquivo | Mudança |
|---|---|
| `src/components/dashboard/RoteirizacaoDialog.tsx` | Substituir bloco `setGroups` dentro de `handleRoteirizar` (linhas ~313–341) pelo novo remapeamento por `cidade+uf` |

Nenhuma mudança no backend necessária — a edge function já retorna `cidade` e `uf` em cada item de `ordemOtimizada`.

