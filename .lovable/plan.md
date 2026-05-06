## O que está acontecendo

Quando o motorista chega na empresa **antes** da carga estar pronta, a Portaria registra a chegada (cria um movimento de entrada com `horario_chegada` preenchido e `carga_id = NULL`). Em seguida a Logística vincula a carga.

O esperado é o card **verde** "Liberar entrada no pátio" (motorista já chegou, só falta liberar). O que aparece é o card azul "Registrar chegada do veículo" como se ele ainda não tivesse chegado.

## Causa

O hook `useCargasFechadasAguardando` casa o movimento de chegada com a carga **filtrando por `carga_id` no movimento**. Mas quando a carga é vinculada automaticamente pelos gatilhos do banco (`on_carga_fechada`, `vincular_veiculo_esperado_tardio`), eles atualizam só `veiculos_esperados.carga_id` — nunca propagam o `carga_id` para a `movimentacoes_portaria` da chegada já registrada.

Resultado: o movimento da chegada fica órfão (`carga_id IS NULL`) e o painel não consegue parear → cai no card azul.

Hoje no banco há 4 chegadas órfãs assim (MACAN/QTU3E84, TREVINHO/MXE9B40, CARLOS MARABA/TWD5I87, ELIAS ROTA/PBV1F92).

A função `useVincularWalkInACarga` (botão manual) já faz esse update, mas só ela. O fluxo automático via trigger não.

## Correção

### 1. Migration SQL — corrigir os gatilhos automáticos

Atualizar as funções `on_carga_fechada()` e `vincular_veiculo_esperado_tardio()` para que, sempre que vincularem uma carga a um walk-in pela placa, também propaguem o `carga_id` para a chegada órfã correspondente:

```sql
UPDATE movimentacoes_portaria
SET carga_id = NEW.carga_id
WHERE upper(trim(placa)) = upper(trim(NEW.placa))
  AND tipo_movimento = 'entrada'
  AND horario_entrada IS NULL
  AND carga_id IS NULL
  AND data_hora > now() - interval '7 days';
```

### 2. Migration SQL — backfill dos órfãos

Mesma migration corrige os 4 registros já quebrados, casando placa + carga em etapa `logistica` + janela operacional.

### 3. Defesa em profundidade no frontend

Em `src/hooks/useCarregamentos.ts`, no `useCargasFechadasAguardando`, ampliar o match: quando o movimento tem `carga_id IS NULL` mas a placa bate com a placa da carga e está dentro da janela operacional (-12h / +48h da data da carga), também é considerado a chegada daquela carga.

Assim, mesmo que algo escape do trigger no futuro, o painel não cai mais para o card azul errado.

### 4. Reforço no `useVincularWalkInACarga`

Já faz o update certo, mas hoje só atualiza movimento com `etapa_terceirizado='chegada'`. Vou remover essa restrição e exigir só `tipo_movimento='entrada'` + `horario_entrada IS NULL` + `placa` + `carga_id IS NULL`, para cobrir variações (carga própria também).

## Resultado esperado

- Walk-in chega → card vermelho "Aguardando vínculo" no Pátio Atual.
- Logística vincula carga → carga sai do vermelho e aparece no painel "Cargas fechadas aguardando veículo" já no estado **âmbar com botão verde "Liberar entrada no pátio"**, mostrando há quanto tempo ele está esperando.
- Os 4 casos órfãos atuais (MACAN, TREVINHO, CARLOS MARABA, ELIAS ROTA) entram no estado correto imediatamente após a migration.

## Arquivos afetados

- Nova migration SQL (gatilhos + backfill)
- `src/hooks/useCarregamentos.ts` (match defensivo + reforço do vínculo manual)
