

# Adicionar CIF/FOB no Consolidado

## Problema

A página Consolidado não exibe o tipo de frete (CIF/FOB) no nível do grupo de carga. O campo `tipo_frete` só aparece nas linhas expandidas dos itens individuais.

## Solução

**`src/pages/Consolidado.tsx`**:

1. Adicionar campo `tipoFrete: string` na interface `CargaGroup`, agregando os tipos de frete únicos dos itens (ex: "CIF", "FOB", ou "CIF / FOB" se misto)
2. Na função `groupByCarga`, coletar os `tipo_frete` distintos em um `Set` e depois juntar com " / "
3. Adicionar coluna **"Frete"** na tabela desktop (header + cells) com sort
4. Adicionar "Frete" na view mobile (grid de detalhes do card)
5. Adicionar sort accessor para `tipoFrete`
6. Adicionar na impressão (`ConsolidadoPrintDialog`) — opcional, mas coerente

| Arquivo | Mudança |
|---|---|
| `src/pages/Consolidado.tsx` | Agregar `tipo_frete` no grupo, adicionar coluna "Frete" na tabela e mobile cards |

