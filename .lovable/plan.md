## Plano: corrigir ordem da roteirização até o romaneio

Pelas imagens, a ordem que aparece no fechamento está diferente da ordem impressa no romaneio. O fluxo precisa manter a mesma sequência em todos os pontos:

```text
Roteirização / Fechar carga → grava ordem_entrega → Consolidado → Romaneio
```

### O que vou ajustar

1. **Garantir ordem estável ao fechar/salvar pré-carga**
   - No fechamento da carga, antes de montar os updates, vou recalcular a sequência final com base na posição visual atual da lista.
   - Cada parada receberá `ordem_entrega` sequencial (`1, 2, 3...`) exatamente na ordem mostrada na tela.
   - Todos os itens do mesmo cliente/parada continuarão recebendo a mesma ordem.

2. **Evitar reset indevido da lista no diálogo de fechamento**
   - Vou proteger o estado local de `groups` para não ser sobrescrito por recomputações do `initialGroups` enquanto o usuário está reordenando.
   - Isso evita o caso em que o usuário arrasta os pedidos, mas uma renderização posterior volta a ordem anterior antes de salvar.

3. **Ordenar o Consolidado e o Romaneio pela ordem gravada**
   - Ao montar o romaneio, os grupos serão ordenados por `ordem_entrega` gravada no banco.
   - Também vou manter a renumeração visual `E:1, E:2...` apenas para exibição, sem inverter ou embaralhar a sequência salva.

4. **Melhorar consistência da busca no Consolidado**
   - Ajustar a consulta/agrupamento para usar `ordem_entrega` como critério determinístico dentro da carga, evitando que a ordem por `id` influencie o resultado quando há múltiplos pedidos.

### Resultado esperado

- A ordem que você organiza na roteirização/fechamento será a mesma salva no banco.
- O Consolidado e o romaneio de entrega vão abrir nessa mesma sequência.
- O romaneio de carregamento continua sendo o inverso da entrega, como já está descrito na legenda.

### Arquivos envolvidos

- `src/components/dashboard/FechamentoLoteDialog.tsx`
- `src/pages/Consolidado.tsx`
- Se necessário, ajuste pontual em `src/components/dashboard/CargaPrintDialog.tsx` apenas para garantir a ordenação visual.