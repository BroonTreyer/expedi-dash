

# Cálculo bidirecional Quantidade ↔ Peso no formulário de pedido

## Ideia
Concordo com a abordagem. Faz sentido ter o cálculo bidirecional:
- **Alterar quantidade** → recalcula peso (qty × peso_padrao) — já funciona hoje
- **Alterar peso** → recalcula quantidade (peso ÷ peso_padrao), arredondando
- **Exceção**: Pão de Alho (produtos em UNID) — quantidade é manual, peso calcula a partir da qty mas nunca o inverso

## Mudanças

### Arquivo: `src/components/dashboard/CarregamentoDialog.tsx`

1. **Nova função `handleItemPeso`** — quando o usuário digita o peso manualmente:
   - Se o produto tem `pesoPadrao > 0` e **não** é Pão de Alho → calcula `quantidade = Math.round(peso / pesoPadrao)`
   - Se é Pão de Alho ou não tem peso padrão → só atualiza o peso, sem mexer na quantidade

2. **Alterar o campo Peso (kg)** no JSX — trocar o `onChange` atual por `handleItemPeso` em vez do `updateItem` direto

3. **`handleItemQuantidade`** — já está correto (recalcula peso = qty × pesoPadrao)

4. Usar a função `isProdutoUnidade` de `constants.ts` para identificar Pão de Alho

### Lógica resumida
```text
Produto normal (ex: Mussarela, peso_padrao=6.3):
  - Digita qty=10  → peso = 63
  - Digita peso=63 → qty = 10

Pão de Alho (peso_padrao=0.4, contado por unidade):
  - Digita qty=1400 → peso = 560
  - Digita peso=560  → qty NÃO muda (fica manual)
```

### Arquivo afetado
- `src/components/dashboard/CarregamentoDialog.tsx` — adicionar `handleItemPeso`, alterar onChange do campo peso

