## Objetivo

Converter os **3 adiantamentos em lote** existentes (2 `pago`, 1 `pendente`) em adiantamentos individuais — 1 ADT por CT-e — para que cada CT-e possa ser quitado separadamente em "Aguardando Quitação".

## Lotes afetados

| Número | Status | Qtd CT-es | Valor ADT | Saldo |
|---|---|---|---|---|
| ADT-20260525-004 | pago | 10 | R$ 59.116,18 | R$ 14.779,04 |
| ADT-20260525-002 | pago | 17 | R$ 87.429,70 | R$ 21.857,43 |
| ADT-20260511-001 | pendente | 4 | R$ 26.223,68 | R$ 6.555,92 |

**Total:** 31 CT-es serão transformados em 31 ADTs individuais.

## Como funciona o desmembramento

Para cada lote existente, executar via script SQL (insert tool):

1. Para **cada CT-e** dentro do lote (`adiantamentos_frete_ctes`):
   - Criar novo registro em `adiantamentos_frete` com:
     - `numero`: sufixo letra (`ADT-...-004-A`, `-B`, `-C`...) preservando unicidade
     - `tipo_agrupamento`: `'ordem'`
     - `ordem_carga`: a OC do CT-e (lida de `ctes_dacte`)
     - `transportadora`, `transportadora_id`, `percentual`, `status`, `pago_em`, `pago_por`, `comprovante_pagamento_url`: copiados do lote pai
     - `qtd_ctes`: 1
     - `peso_total`: peso do CT-e
     - `valor_total_ctes`: `valor_frete` do CT-e (da tabela `adiantamentos_frete_ctes`)
     - `valor_adiantamento`: `valor_frete * percentual / 100`
     - `valor_saldo`: `valor_frete - valor_adiantamento`
     - `observacoes`: `"Desmembrado de <numero_lote_original>"`
   - Mover a linha de `adiantamentos_frete_ctes` para apontar para o novo ADT individual
2. Após processar todos os CT-es, **deletar o lote original** (CASCADE não é necessário pois os CT-es já foram realocados; usar DELETE simples após mover).

## Detalhes técnicos

- Executado em **uma única transação** via insert tool (SQL com `DO $$ ... $$`).
- Mantém integridade: `pago_em`/`pago_por` preservados nos lotes já pagos → continuam aparecendo na aba "Aguardando Quitação" com status `pago` mas agora individualmente quitáveis.
- Não há mudança de schema — apenas dados.
- Nenhuma alteração de código frontend necessária (a UI já suporta ADTs individuais).

## Resultado

Após executar:
- Os 3 lotes desaparecem.
- Surgem 31 ADTs individuais (10 + 17 + 4) na aba "Aguardando Quitação".
- Cada um pode ser quitado isoladamente.
