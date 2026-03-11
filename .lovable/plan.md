

# Adicionar badge "Ruptura" nos itens expandidos do pedido

## Contexto
Quando um pedido tem múltiplos itens e alguns estão com ruptura, atualmente só aparece o ícone de alerta (triângulo) nas linhas expandidas. O usuário quer um badge claro indicando quais itens específicos estão com ruptura.

## Mudança — `src/components/dashboard/CarregamentoTable.tsx`

### Desktop (linhas expandidas do grupo, ~linha 441-444)
Adicionar um badge "Ruptura" (estilo âmbar, igual ao do mobile) ao lado do ícone de alerta nas child rows quando `c.ruptura` é true.

### Mobile (child items no grupo)
Já existe o badge na `MobileCardItem` (linha 146-149). Porém em itens agrupados (`isGrouped = true`), ele é exibido normalmente — está ok.

### Resultado visual
Cada item expandido que tiver `ruptura = true` mostrará:
```
⚠ Ruptura   (badge âmbar compacto)
```
Itens sem ruptura ficam sem badge, facilitando identificar visualmente qual item do pedido está com problema.

## Arquivo (1)
- `src/components/dashboard/CarregamentoTable.tsx`

