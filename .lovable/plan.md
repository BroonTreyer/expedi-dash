## Problema

A busca por nº de OC já chega a buscar no banco (vimos no DB que `129871` existe em 26/05/2026), mas a tela mostra "Nenhuma carga consolidada para este dia". Há um segundo filtro pós-fetch em `rawGroups` (linha 683) que descarta qualquer grupo cuja `dataEfetiva` esteja fora do `dateFromStr..dateToStr`. Como o range atual é 09/06/2026 e a OC é de 26/05/2026, ela é eliminada.

## Correção

Arquivo: `src/pages/Consolidado.tsx`

No `useMemo` de `rawGroups`, ignorar o filtro `isWithin` quando o usuário estiver buscando por OC (`debouncedOC` preenchido):

```ts
const isWithin = !!debouncedOC || (dataEfetiva >= dateFromStr && dataEfetiva <= dateToStr);
```

E adicionar `debouncedOC` às dependências do `useMemo`.

Nenhuma outra mudança — quando a busca é limpa, o comportamento por data volta ao normal.

## Validação

Digitar `129871` em Consolidado: deve aparecer a carga `CG-20260526-141354-JDJ` de 26/05/2026 mesmo com o seletor de período em 09/06/2026.
