# Carga fechada cai direto como "Expedido"

## Causa confirmada (dados de hoje)

A carga **WLJ / TFI2E43** (`CG-20260806-150846-77I`, fechada hoje 15:06 SP) nasceu como Expedida porque duas movimentações **antigas e já finalizadas** da placa TFI2E43 (chegada 14:59, finalizadas 15:05, sem entrada no pátio) foram automaticamente amarradas à carga nova no momento do fechamento.

Motivo: o gatilho `on_carga_fechada` ainda faz:

```text
UPDATE movimentacoes_portaria SET carga_id = <nova carga>
WHERE placa = NEW.placa
  AND tipo_movimento = 'entrada'
  AND horario_entrada IS NULL
  AND carga_id IS NULL
  AND data_hora > now() - interval '7 days'
```

Ou seja: ele só exige "sem entrada no pátio" e "últimos 7 dias" — **não exige que a movimentação esteja em aberto**. Movimentações já encerradas (`etapa_terceirizado='finalizado'` / `horario_saida_final` preenchido) são capturadas, e como o cálculo de status trata "finalizado/saída" como Expedido, a carga pula o card azul ("Chegou / aguardando liberação").

O gatilho irmão `vincular_veiculo_esperado_tardio` já foi corrigido antes (janela 24h + ignora finalizados); o `on_carga_fechada` ficou de fora — é a mesma falha na outra porta.

## Correção

**1. Gatilho `on_carga_fechada` (migração)**
- Ao vincular movimentações à carga recém-fechada, exigir também:
  - `horario_saida_final IS NULL`
  - `COALESCE(etapa_terceirizado,'') <> 'finalizado'`
  - `COALESCE(etapa_carga_propria,'') NOT IN ('finalizado','em_rota','retornou')`
- Reduzir a janela de 7 dias para 24 horas (mesma regra do outro gatilho).

**2. Blindagem no cálculo de status (frontend)**
Em `useStatusPortariaPorCarga`, ignorar movimentações cuja finalização (`horario_saida_final`) seja **anterior** à criação da carga, para que um vínculo indevido remanescente não volte a marcar Expedido. Movimentações válidas não são afetadas.

**3. Acertar os dados atuais**
- Desvincular as duas movimentações finalizadas de TFI2E43 da carga `CG-20260806-150846-77I`.
- A carga volta para "Aguardando chegada" e segue o fluxo normal (chegada → azul → pátio → carregando → expedido).

## Resultado esperado

Fechar carga nunca herda movimentação encerrada de viagem anterior; a carga sempre inicia em "Aguardando" e passa pelo card azul.