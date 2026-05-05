## Mudança simples no Gastos por Vendedor

Remover totalmente a exibição/inclusão de cargas FOB. Mostrar apenas CIF e não classificadas — sem toggle.

### `src/hooks/useGastosVendedor.ts`
- Remover o parâmetro `filtroTipoFrete` e o tipo `FiltroTipoFrete`.
- Dentro do loop de cargas, sempre pular cargas classificadas como `fob` ou `misto` (que contém FOB).
- Manter cargas `cif` e `nao_classificado`.
- Manter o objeto `cobertura` retornado, mas remover a contagem de `fob`/`misto` da UI (ou apenas exibir CIF + não classificadas).

### `src/components/logistica/GastosVendedorTab.tsx`
- Remover o `<Select>` de tipo de frete e o estado `filtroFrete`.
- Remover o badge FOB do card de cobertura — mostrar só "X CIF · Y não classificadas".
- Atualizar mensagens de empty state para "Nenhuma carga CIF/não classificada no período".
- Remover lógica de filtro client-side (já vem filtrado do hook).

### Resultado
- Gastos por Vendedor passa a considerar apenas CIF + cargas sem classificação de tipo de frete.
- FOB fica completamente fora — nem aparece no card de cobertura nem na lista.
