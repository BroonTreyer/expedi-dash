

# Corrigir peso de Pão de Alho e Kit Feijoada

## Problema
Quando o usuário digita a quantidade (ex: 1400 unidades de Pão de Alho), o peso não recalcula. O sistema salva peso = 0.4 kg (peso padrão de 1 unidade) independente da quantidade. Deveria ser 0.4 × 1400 = 560 kg.

Dados atuais no banco com peso errado:
- PAO DE ALHO TRADICIONAL: qty=1400, peso=0.4 (deveria ser 560)
- PAO DE ALHO PICANTE: qty=400, peso=0.4 (deveria ser 160)
- PAO DE ALHO COM CALABRESA: qty=500, peso=0.4 (deveria ser 200)
- INGREDIENTES P/ FEIJOADA: qty=100, peso=5 (deveria ser 500)

## Mudanças

### 1. `src/components/dashboard/CarregamentoDialog.tsx` — recalcular peso ao mudar quantidade
Na função `handleItemQuantidade` (linha 209), quando o item tem `pesoPadrao > 0`, recalcular o peso automaticamente:
```ts
const handleItemQuantidade = (index: number, qty: number) => {
  const item = items[index];
  if (item.pesoPadrao > 0) {
    updateItem(index, { quantidade: qty, peso: item.pesoPadrao * qty });
  } else {
    updateItem(index, { quantidade: qty });
  }
};
```
Isso mantém o princípio de peso manual (o usuário pode editar o campo peso depois), mas garante que ao mudar quantidade o cálculo inicial é feito.

### 2. Corrigir dados existentes no banco
Migration SQL para recalcular o peso dos registros afetados:
```sql
UPDATE carregamentos_dia c
SET peso = p.peso_padrao * c.quantidade
FROM produtos p
WHERE c.codigo_produto = p.codigo_produto
  AND p.peso_padrao > 0
  AND c.quantidade > 0
  AND c.peso = p.peso_padrao;
```
Isso corrige apenas os registros onde peso = peso_padrao (não multiplicado pela quantidade).

## Arquivos afetados
- `src/components/dashboard/CarregamentoDialog.tsx` — 1 alteração na função handleItemQuantidade
- Migration SQL — corrigir dados existentes

