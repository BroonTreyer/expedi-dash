# Corrigir data exibida para cargas terceirizadas

## Problema
Quando um motorista terceirizado chega num dia (ex.: ontem) e termina o carregamento/sai em outro (ex.: hoje), a carga continua aparecendo apenas na data antiga em **Consolidado** e **Expedição**. O esperado é que ela seja contabilizada no dia em que efetivamente saiu/foi finalizada.

## Escopo
- **Apenas cargas terceirizadas** (com `transportadora` preenchida). Frota própria não é afetada.
- Atinge somente as telas **Consolidado** e **Expedição — Distribuidores** (KPIs de peso, painel "Cargas expedidas do dia" e agrupamento por data).
- Pedidos individuais e relatórios mantêm a data original (`carregamentos_dia.data`) como referência fiscal/operacional.

## Critério da nova data ("data efetiva")
Para cada carga terceirizada, usar a primeira data disponível abaixo:
1. Data da **saída final pela portaria** (`movimentacoes_portaria.horario_saida_final`, etapa `expedido`).
2. Senão, data em que **todos os itens** ficaram com `status = "Carregado"` (usar `MAX(updated_at)` dos itens da carga quando todos estiverem Carregado).
3. Senão (ainda em andamento), mantém a `data` original.

Assim a regra é: "saiu hoje → conta hoje", "finalizou no faturamento hoje → conta hoje", "ainda não terminou → fica no dia original".

## Abordagem técnica (apenas exibição, não muda o banco)

### 1. Novo hook utilitário
`src/hooks/useDataEfetivaTerceirizadas.ts`
- Recebe lista de `{ carga_id, data_original }` (apenas com transportadora).
- Busca em `movimentacoes_portaria` o `horario_saida_final` mais recente por `carga_id` (categoria `terceirizado`).
- Combina com status agregado já calculado (todos Carregado → usa `max(updated_at)`).
- Retorna `Map<carga_id, dataEfetiva>` (string `yyyy-MM-dd`).

### 2. Consolidado (`src/pages/Consolidado.tsx`)
- No `useConsolidado`, ampliar a janela de busca: além de `data = X`, trazer também cargas terceirizadas cuja **data efetiva** caia em X (buscar movimentos de saída do dia + cargas com `updated_at` no dia e todos itens "Carregado").
- Após `groupByCarga`, sobrescrever `g.data` pela data efetiva quando a carga for terceirizada e tiver data efetiva calculada.
- Filtrar fora do `dateRange` cargas cuja data efetiva caia fora do intervalo selecionado.
- Cargas próprias seguem 100% inalteradas.

### 3. Expedição (`src/pages/Expedicao.tsx` + `useCargasDiaExpedicao`)
- Em `useCargasDiaExpedicao(dateStr)`, ampliar a query para também incluir cargas terceirizadas de outras datas cuja **data efetiva = dateStr** (saída no dia ou finalização hoje com todos itens Carregado).
- Reatribuir `c.data = dataEfetiva` antes do agrupamento, para que KPIs de peso (kgCarregado/kgACarregar/kgTotal) e o painel "Cargas expedidas do dia" reflitam o dia correto.
- Remover do dia anterior as cargas que migraram (filtro por data efetiva ≠ dateStr quando estamos olhando o dia antigo).

### 4. Realtime
Acrescentar invalidação por `movimentacoes_portaria` (saída final) nos dois hooks, para que assim que a portaria registre a saída, a carga "pule" para hoje em < 2s nas duas telas.

## O que NÃO muda
- `carregamentos_dia.data` no banco permanece o dia original (fiscal).
- Página de Logística, relatórios XLSX, Rupturas, vendedores, portal motorista — sem alteração.
- Cargas de **frota própria** (sem `transportadora`) — sem alteração.
- Pedidos individuais continuam aparecendo no dia original quando consultados fora do agrupamento por carga.

## Validação
- Caso Fernando: chegou ontem, saiu hoje → some do Consolidado/Expedição de ontem, aparece em hoje, com peso total contabilizado nos KPIs de hoje.
- Caso ainda em andamento (chegou ontem, está carregando hoje sem saída registrada e com itens não Carregado) → permanece em ontem (sem mudar).
- Caso de frota própria → permanece exatamente como hoje.
