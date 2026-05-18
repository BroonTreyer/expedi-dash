## Onde aplicar

Tela **Logística → Adiantamentos → aba "Gerar"** — arquivo `src/components/logistica/AdiantamentosTab.tsx` e o card "Resumo" (lateral direita) mostrado no print.

## O que o print pede

> "tem q trazer o valor da tabela.. e tb valor q eu fechei.. para comparativos.. tem q fazer um custo do valor /pelo peso. para saber o custo kg.. me dar a opção de mudar o valor do adiantamento."

Três entregas:

1. **Comparativo Tabela × Fechado** por CT-e e por transportadora.
2. **Custo por kg** (R$/kg) calculado a partir do valor fechado e do peso.
3. **Permitir editar o valor do adiantamento** manualmente (hoje só dá pra mudar o %).

## Como funciona hoje

- Cada CT-e (`ctes_dacte`) tem `valor_frete` (= valor que foi fechado) e `peso_total`.
- A tabela de preços existe em `tabelas_frete_itens` (`valor_kg_bitruck`, `valor_kg_carreta`, por destino e código de cliente) e/ou `tabela_frete` (`valor_kg` por destino + `tipo_veiculo`).
- O tipo do veículo vem de `caminhoes.tipo_caminhao` via `ctes_dacte.placa`.
- O Resumo só mostra: nº CT-es, peso total, total fretes, adiantamento (% × total), saldo.
- O percentual de adiantamento é editável por transportadora; o **valor em R$** do adiantamento não é editável.

## Mudanças propostas

### 1. Buscar "valor de tabela" para cada CT-e

Novo hook `useValoresTabelaPorCte(ctes)` que, dado um conjunto de CT-es:
- Resolve o tipo do veículo (`bitruck` / `carreta`) cruzando `placa` → `caminhoes.tipo_caminhao`.
- Busca em `tabelas_frete_itens` por `destino_cidade` + `destino_uf` (+ código do cliente quando disponível) o `valor_kg_bitruck` ou `valor_kg_carreta`.
- Fallback para `tabela_frete` (`destino_cidade`+`destino_uf`+`tipo_veiculo`) quando não houver item específico.
- Retorna `Map<cteId, { valorTabela, valorKgTabela, tipoVeiculo, origem: 'item'|'generica'|'indisponivel' }>`.
- `valorTabela = valor_kg × peso_total`.

### 2. Mostrar comparativo na tabela de CT-es

Na tabela onde cada CT-e é listado (linha `numero_cte … peso … valor_frete`), adicionar duas colunas à direita:

```text
| CT-e | Destino | Peso | Vl. Tabela | Vl. Fechado | R$/kg | Δ |
```

- **Vl. Tabela**: `fmtBRL(valorTabela)` (ou "—" se não houver tabela).
- **Vl. Fechado**: o atual `valor_frete`.
- **R$/kg**: `valor_frete / peso_total` formatado `pt-BR`.
- **Δ**: diferença em R$ e %, colorido (verde se fechado ≤ tabela, vermelho se fechado > tabela). Não exibir cor vermelha se não houver tabela.

### 3. Card "Resumo" — totais comparativos

Adicionar no bloco de totais gerais:

```text
Peso total:        16.472,3 kg
Total tabela:      R$ 16.900,00     ← novo
Total fechado:     R$ 16.307,57     ← rótulo atualizado
Diferença:         −R$ 592,43 (−3,5%) ← novo
Custo médio/kg:    R$ 0,99           ← novo (= total fechado / peso)
```

E, em cada bloco por transportadora, mostrar mini-linha: `R$/kg médio` e `Δ vs tabela`.

### 4. Editar valor do adiantamento manualmente

Hoje o adiantamento é calculado por `%`. Mudanças:

- Tornar o **valor em R$ do adiantamento editável** por transportadora (input numérico ao lado do `%`).
- Ao editar o R$: o `%` é recalculado a partir do total (`adt / total × 100`).
- Ao editar o `%`: o R$ é recalculado (comportamento atual).
- Estado novo: `adiantamentosManuais: Record<string, number>` mantido no `AdiantamentosTab`.
- `resumoPorTransp` passa a usar `adiantamentosManuais[nome] ?? total × pct/100` como `adt`.
- Mostrar pequeno indicador "manual" quando o valor for sobrescrito, com botão "voltar ao %".
- Persistir no `criar.mutate(...)` o valor final (já é gravado em `adiantamentos_frete.valor_adiantamento`, sem mudança de schema).

### 5. Sem mudança de banco

Tudo derivado de tabelas já existentes (`ctes_dacte`, `caminhoes`, `tabelas_frete_itens`, `tabela_frete`). Nenhuma migration.

## Detalhes técnicos

- Novo hook: `src/hooks/useValoresTabelaPorCte.ts` — uma query única que pega placas únicas + destinos únicos do conjunto de CT-es selecionáveis, evitando N+1.
- Memoização: o cálculo do comparativo entra no `useMemo` do `resumoPorTransp`.
- Formatação: usar os helpers `fmtBRL` / `fmtKg` já existentes; criar `fmtRkg` para `R$/kg` (`maximumFractionDigits: 3`).
- Cores semânticas: `text-emerald-600` / `text-destructive` via tokens já existentes (não introduzir cores cruas).
- Acessibilidade: manter tabular-nums nas colunas numéricas.

## Fora de escopo

- Não mexer no fluxo dos adiantamentos já gerados (aba "Pendentes"/"Pagos").
- Não criar tela de cadastro de tabela de frete (já existe).
- Não alterar regra de divergência de status do CT-e.
