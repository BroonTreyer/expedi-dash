## O que está acontecendo

O erro que você está vendo no console é apenas um **warning** (aviso), não um erro que quebra a aplicação:

```
Warning: Function components cannot be given refs.
Check the render method of `RotaMap` → at FitBounds
```

### Causa raiz

No arquivo `src/components/dashboard/RotaMap.tsx`, o componente `FitBounds` (linha 182) é uma função simples sem `forwardRef`. Porém, o `react-leaflet` (na versão atual) tenta passar um `ref` automaticamente para todos os filhos do `<MapContainer>`, incluindo o `<FitBounds points={...} />` na linha 448.

Como `FitBounds` não usa `forwardRef`, o React imprime esse warning toda vez que o mapa de roteirização é renderizado.

**Importante:** isso **não impede** o funcionamento do mapa, da roteirização ou de nada no app. É só ruído no console que polui o log e atrapalha quando você está debugando outras coisas.

## Correção

Envolver o componente `FitBounds` em `React.forwardRef` para aceitar (e ignorar) o ref que o react-leaflet tenta passar.

### Mudança técnica

**Arquivo:** `src/components/dashboard/RotaMap.tsx` (linhas 181-195)

Trocar:
```tsx
function FitBounds({ points }: { points: Coords[] }) {
  const map = useMap();
  useEffect(() => { ... }, [points, map]);
  return null;
}
```

Por:
```tsx
const FitBounds = React.forwardRef<unknown, { points: Coords[] }>(
  function FitBounds({ points }, _ref) {
    const map = useMap();
    useEffect(() => { ... }, [points, map]);
    return null;
  }
);
```

Isso silencia o warning sem alterar o comportamento.

## Resumo

- 1 arquivo alterado: `src/components/dashboard/RotaMap.tsx`
- Sem mudança de comportamento, apenas remove o warning do console
- Nenhuma alteração de banco, edge function ou outras telas

Quer que eu aplique?