
## Problema

O mapa não exibe marcador para Goiânia (ponto de origem). O componente `RotaMap` só renderiza marcadores para os `destinos` (clientes), ignorando completamente a origem.

Olhando a imagem enviada pelo usuário, vemos que:
- O marcador **"2"** aparece em Pernambuco (correto)
- O marcador **"1"** está visível em Ilhéus (correto)
- Mas **Goiânia** (início da rota) não tem marcador — apenas a linha começa de lá

## Causa Raiz

Em `RotaMap.tsx`, a prop `destinos` só contém os clientes de destino. Não há prop para a origem, nem lógica para geocodificar e renderizar um marcador especial para Goiânia.

## Plano de Correção

### 1. `src/components/dashboard/RotaMap.tsx`

**Adicionar prop `origem`** à interface `Props`:
```typescript
interface Props {
  destinos: DestinoRota[];
  origem?: { cidade: string; uf: string }; // novo
  routeGeometry?: ...
  ...
}
```

**Geocodificar a origem** junto com os destinos (incluída no `citySetKey` e no `useEffect` de geocodificação).

**Criar ícone especial para origem** — estilo diferente: estrela ou "G" / ícone de casa, com cor distinta (ex: laranja/amarelo) para distinguir do marcador "start" dos destinos.

**Renderizar o marcador de origem** separado dos `sortedPoints`, com `Popup` mostrando "Origem: Goiânia – GO" (ou a cidade/uf passada).

**Incluir a coord da origem no `FitBounds`** para que o zoom/pan inclua Goiânia no bounds do mapa.

### 2. `src/components/dashboard/RoteirizacaoDialog.tsx`

Passar `origem={{ cidade: "Goiânia", uf: "GO" }}` (ou a origem configurada) para `<RotaMap>`.

Usar a mesma origem que é enviada para a edge function (`origemCidade`/`origemUf`).

### 3. `src/components/dashboard/FechamentoLoteDialog.tsx`

Verificar se o mapa é renderizado lá também e passar a mesma prop `origem`.

## Detalhes Técnicos

- O ícone de origem terá cor **laranja** (`hsl(25, 95%, 53%)`) com letra "G" (ou ícone de pin especial), tamanho ligeiramente maior (34px) para destacar-se dos destinos
- A origem é geocodificada junto no mesmo `useEffect`, sem requisição duplicada (usa o mesmo `geocodeCache`)
- A `citySetKey` incluirá a origem para garantir re-geocodificação se a origem mudar
- O `FitBounds` receberá todos os pontos incluindo a origem

## Arquivos a Editar

| Arquivo | Mudança |
|---|---|
| `RotaMap.tsx` | Adicionar prop `origem`, geocodificar, renderizar marcador especial, incluir no FitBounds |
| `RoteirizacaoDialog.tsx` | Passar `origem={{ cidade: "Goiânia", uf: "GO" }}` ao RotaMap |
| `FechamentoLoteDialog.tsx` | Verificar e passar `origem` se aplicável |
