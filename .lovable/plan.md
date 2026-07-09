
## O que foi descoberto

Investiguei o pedido AGILE / HIM2I61 / Gilvan (`carga_id = PRE-20260706-093113-J6Q`, `data = 2026-07-06`, sem transportadora → carga própria):

1. **Consolidado — bug real.** A query SQL traz corretamente cargas atrasadas com `status ≠ Carregado` via carry-over de 30 dias. Mas o filtro client-side em `src/pages/Consolidado.tsx` (linha 685) chama `computeDataEfetivaTerceirizada` e depois exige `dataEfetiva ∈ [dateFromStr, dateToStr]`. Em `src/lib/data-efetiva.ts` a regra "puxar para hoje" só se aplica a cargas **terceirizadas**. Como AGILE é carga própria, `dataEfetiva` fica em 06/07, e como o intervalo é 09/07–09/07, a carga é descartada. Vale para Consolidado e para qualquer tela que reuse essa função.
2. **Distribuidores.** O cliente AGILE (código 21435) está com `clientes.tipo = 'outros'`, e `/distribuidores` filtra por `tipo = 'distribuidor'`. Basta reclassificar.
3. **Vínculo com pré-carga.** `useVincularMovimentoACarga` e `useVincularWalkInACarga` só promovem `etapa: pre_carga → logistica`, mas preservam o `carga_id` `PRE-…`. Isso confunde relatórios e telas que assumem prefixo `CG-`. Vou gerar um `CG-YYYYMMDD-HHMMSS-XXX` (mesmo padrão do `FechamentoLoteDialog`) e propagar para `carregamentos_dia`, `veiculos_esperados` e `movimentacoes_portaria`.

## Mudanças

### 1. `src/lib/data-efetiva.ts` — estender a regra para carga própria em aberto
Cargas próprias sem `horario_saida_final` e com `status ≠ 'Carregado'` passam a puxar para hoje da mesma forma que as terceirizadas. Assinatura ganha o parâmetro `saidaPortariaIso` já usado.

```text
computeDataEfetiva(items, dataOriginal, saidaPortariaIso, today)
  se saidaPortariaIso       → data(saida)         (fixa)
  senão se algum item.status = 'Carregado' e sem saída → dataOriginal  (finalizada por faturamento)
  senão                     → max(dataOriginal, today)  (em andamento, puxa p/ hoje)
```

O call-site em `Consolidado.tsx` continua igual, só passa a considerar carga própria também. Renomeio a função para `computeDataEfetiva` (mantenho o alias `computeDataEfetivaTerceirizada` para não quebrar imports; se não houver outros consumidores, removo).

### 2. `src/hooks/useCarregamentos.ts` — promover PRE- para CG- no vínculo
Nova helper `gerarCargaIdReal()` (mesmo formato do `FechamentoLoteDialog`).

Em `useVincularMovimentoACarga` e `useVincularWalkInACarga`, quando `input.cargaId` começar com `PRE-`:
- gerar `novoCargaId`;
- `UPDATE carregamentos_dia SET carga_id = novoCargaId, etapa = 'logistica' WHERE carga_id = PRE-...`;
- `UPDATE veiculos_esperados SET carga_id = novoCargaId WHERE carga_id = PRE-...`;
- `UPDATE movimentacoes_portaria SET carga_id = novoCargaId WHERE carga_id = PRE-...`;
- usar `novoCargaId` no restante do fluxo (movimentos por placa, etc.).

Quando o `carga_id` já for `CG-…`, comportamento atual permanece.

### 3. Dados existentes — migração pontual
- Reclassificar cliente `21435 AGILE` para `tipo = 'distribuidor'`.
- Gerar um `CG-…` para a carga atual `PRE-20260706-093113-J6Q` e propagar em `carregamentos_dia`, `veiculos_esperados` (id `e08f7a9a…`) e `movimentacoes_portaria` (id `1231f771…`).

Feito via ferramenta `insert` (UPDATE-only), sem alterar schema.

## Validação
- Rodar Playwright em `/consolidado` (hoje = 09/07) e confirmar que a linha AGILE / HIM2I61 aparece, e que o `carga_id` exibido é `CG-…` e não mais `PRE-…`.
- Abrir `/distribuidores` e confirmar que AGILE aparece.
- Confirmar que o card "Cargas fechadas aguardando veículo" na Portaria continua exibindo AGILE com "Aguardando liberação" (o vínculo não é desfeito).
- `psql` para conferir que `carregamentos_dia`, `veiculos_esperados` e `movimentacoes_portaria` compartilham o mesmo `CG-…`.
