## Contexto
A aba **Gastos por Vendedor** já faz rateio proporcional por peso, mas o usuário precisa de transparência quando uma carga tem **vários vendedores**: ver exatamente quais pedidos consolidados de cada vendedor entraram no rateio, sem misturar pesos.

A lógica atual (`useGastosVendedor`) já calcula corretamente:
`gasto_vendedor = (peso_do_vendedor_naquela_carga / peso_total_da_carga) × valor_frete_CTe`

O que falta: **visibilidade e drill-down** para o usuário conferir que o sistema está puxando só o peso do vendedor.

## Mudanças

### 1. `useGastosVendedor.ts` — incluir detalhamento
Adicionar campo `detalhes` em cada `GastoVendedor` com a lista de cargas/CT-es que contribuíram:
```
detalhes: Array<{
  carga_id: string,
  nome_carga: string | null,
  numero_cte: string,
  data_emissao: string | null,
  peso_vendedor_kg: number,    // só o peso DESTE vendedor na carga
  peso_total_carga_kg: number, // peso total da carga (todos vendedores)
  valor_frete_total: number,   // frete total do CT-e
  share_percent: number,       // % do rateio
  frete_rateado: number,       // R$ do vendedor neste CT-e
  pedidos: Array<{ numero_pedido: number, cliente: string, peso: number }>
}>
```
Buscar também `nome_carga`, `numero_cte`, `numero_pedido`, `cliente` nas queries existentes (sem nova rodada extra).

### 2. `GastosVendedorTab.tsx` — drill-down expansível
- Tornar cada linha do vendedor **expansível** (botão chevron). Ao clicar, abre uma sub-tabela mostrando:
  - Carga (nome + carga_id) | CT-e | Data | Peso vendedor / Peso total | Share % | Frete rateado
  - Sub-linha de pedidos consolidados do vendedor naquela carga (número, cliente, peso)
- Adicionar coluna "Cargas" (qtd de cargas distintas) ao lado de "CT-es".
- Indicador visual quando uma carga é **multi-vendedor** (badge "X vendedores") para evidenciar o rateio.

### 3. Filtro adicional
Adicionar filtro opcional **por vendedor** (Select) no topo, que filtra as linhas exibidas e o totalizador.

## Validação
- Carga com 2 vendedores (60% peso A, 40% peso B), CT-e R$ 1.000 → A = R$ 600, B = R$ 400, ambos visíveis no drill-down com seus respectivos pedidos.
- Carga com 1 vendedor → continua igual, drill-down mostra todos os pedidos desse vendedor.
- Totais de peso e frete batem com a soma dos detalhes.