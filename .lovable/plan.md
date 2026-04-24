## Adicionar "peso faltante a carregar" no card Peso Total

**Arquivo:** `src/components/dashboard/KpiCards.tsx`

- Calcular `pesoFaltante = Math.max(0, pesoTotal - pesoCarregado - pesoCarregando)` usando as variáveis já existentes no componente.
- No objeto do card "Peso Total", adicionar `sub: pesoFaltante > 0 ? "<valor> kg a carregar" : undefined`, reaproveitando o mesmo estilo de `sub` já usado no card de Rupturas.
- Atualizar o `tooltip` do card "Peso Total" para incluir a explicação: peso planejado total e quanto ainda falta carregar (Aguardando, descontando rupturas).
- Esconder o `sub` automaticamente quando `pesoFaltante === 0`.

### Comportamento resultante
- Card "Peso Total" mostra o valor total em destaque + linha pequena "X kg a carregar" abaixo.
- Quando tudo já foi embarcado, a linha some.
- Respeita seleção (`selectedData`) — usa o mesmo `source`.