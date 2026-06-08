## Problema

O cálculo de frete usa `ctes_dacte.peso_total`, mas os CT-es às vezes são emitidos com peso 0 (passagem em barreira fiscal). Isso zera o `valor_tabela` e distorce R$/kg, totais por ordem e comparativos com o valor real.

## Solução

Calcular o frete pelo **peso da carga** (somatório dos pedidos em `carregamentos_dia` por `carga_id` + data, já com rupturas aplicadas), com possibilidade de **override manual por ordem de carga** quando o operador quiser ajustar. O valor de tabela passa a ser `peso_da_ordem × valor_kg do destino majoritário` da ordem, em vez de somar CT-e por CT-e.

## Mudanças

### 1. Banco

Migration adicionando `peso_carga_manual numeric` em `ctes_dacte` (nullable). Quando preenchido, vale para todos os CT-es da mesma `ordem_carga` (o app grava o mesmo valor em todas as linhas da ordem para simplicidade — sem nova tabela).

### 2. Novo hook `usePesoEfetivoPorOrdem(ctes)`

Para cada `ordem_carga`, retorna `{ pesoEfetivo, fonte: 'manual' | 'carga' | 'cte', destinoMajoritario: {cidade, uf} }`:

1. Se qualquer CT-e da ordem tem `peso_carga_manual > 0` → usa esse valor (fonte `manual`).
2. Senão, soma `pesoEfetivo` de `carregamentos_dia` (via `usePesoPorCarga`, já existente) pelo par `(carga_id, data)` referenciado pelos CT-es da ordem (fonte `carga`).
3. Senão, soma `peso_total` dos CT-es (fonte `cte`, fallback atual).

Destino majoritário = destino (`cidade|uf`) com maior peso de CT-es; em empate, maior número de CT-es; depois ordem alfabética.

### 3. Refatorar `useValoresTabelaPorCte`

Em vez de calcular CT-e a CT-e, calcula **uma vez por ordem**:

- `valor_kg` = tarifa do destino majoritário (mesma cascata atual: item → genérica, por tipo de veículo da placa).
- `valorTabelaOrdem = pesoEfetivo × valor_kg`.
- Para preservar a UI por CT-e (colunas existentes), retorna o resultado da ordem rateado proporcionalmente ao `valor_frete` de cada CT-e (ou em partes iguais se todos os fretes da ordem forem 0). O total agregado por ordem/transportadora fica correto.
- CT-es sem `ordem_carga` continuam no comportamento atual (peso_total do CT-e).

### 4. UI

**`CtesDacteTab.tsx` (visão Por Ordem)**

- Coluna "Peso (kg)" passa a mostrar `pesoEfetivo` da ordem, com badge discreto: `carga` (verde), `manual` (azul) ou `CTE` (cinza, atual).
- Botão lápis na linha-mãe da ordem abre um pequeno popover "Peso da carga (kg)" com input numérico e ações Salvar / Limpar override. Salvar faz `UPDATE ctes_dacte SET peso_carga_manual = X WHERE ordem_carga = Y` (limpar = `NULL`).
- Tooltip no badge explica a origem do número.

**`AdiantamentosTab.tsx` (Montar Lote + cards de Pendentes/Pagos/Quitados)**

- `resumoPorTransp.peso` e `r.peso` passam a usar o pesoEfetivo agregado por ordem (somando ordens distintas dos CT-es selecionados).
- `totalTabela` vem do novo cálculo (não muda nome de campo, só a fonte).
- R$/kg exibido continua `total / pesoEfetivo`.

### 5. Compatibilidade

- `peso_total` dos CT-es continua intacto no banco (nada é sobrescrito).
- Adiantamentos já criados não são afetados — somente cálculos exibidos em tela. O valor gravado em `adiantamentos_frete.peso_total` ao gerar novos passa a ser o pesoEfetivo.

## Fora de escopo

- Mudar o `valor_frete` dos CT-es (continua o que veio no DACTE).
- Editar peso por CT-e individual (override é por ordem, conforme decidido).
- Distribuição proporcional sofisticada por destino — assumimos destino majoritário por ordem.

## Detalhes técnicos

- Migration: `ALTER TABLE public.ctes_dacte ADD COLUMN peso_carga_manual numeric;` (RLS herda; sem GRANT extra).
- `useCtesDacte` já faz `select *`, então o novo campo entra automático; adicionar no type `CteDacteRow`.
- Reaproveita `usePesoPorCarga` (filtra por `carga_id+data`, evita inflar com histórico).
- Cache do `useValoresTabelaPorCte` recalculado quando `pesoEfetivoMap` mudar (incluir no `queryKey`).