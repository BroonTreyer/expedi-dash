## Situação do Marcelo (PBV1F92)

Verifiquei no banco. O Marcelo está hoje em `veiculos_esperados` com `status_autorizacao = 'aguardando_vinculo'` e `created_at = 29/04 23:12 UTC`. Porém **não existe** linha em `movimentacoes_portaria` para essa chegada — o registro foi feito **antes** do deploy do novo fluxo granular (chegada → entrada → saída). Por isso o "horário de chegada" dele está apenas no `created_at` do veículo esperado, não no campo oficial `horario_chegada` da movimentação.

## Fluxo correto a partir de agora (já implementado para novos registros)

```text
[Portaria registra chegada walk-in]
    │  cria veiculos_esperados (aguardando_vinculo)
    │  cria movimentacoes_portaria (etapa=chegada, horario_chegada=now)
    ▼
[Logística vincula carga (Expedição/Consolidado)]
    │  veiculos_esperados.carga_id = X, status=autorizado
    │  movimentacoes_portaria.carga_id = X (mesma linha, ainda etapa=chegada)
    ▼
[Portaria libera entrada no pátio]
    │  movimentacoes_portaria.horario_entrada = now, etapa=no_patio
    ▼
[Operação carrega o veículo / fecha lacre]
    │  movimentacoes_portaria.etapa = finalizado, numero_lacre, foto
    ▼
[Portaria registra saída]
    │  movimentacoes_portaria.horario_saida_final = now
    │  status final, aparece no histórico com duração total real
```

No caso do Marcelo: assim que a Logística vincular uma carga a ele, ele sai da fila "Aguardando vínculo" e vai pra "Aguardando entrada no pátio". Quando a portaria liberar a entrada, marca-se `horario_entrada`. Na saída, `horario_saida_final`. A duração total será `horario_saida_final - horario_chegada`.

## Problema do registro legado do Marcelo

Como ele foi cadastrado antes da nova lógica, **não existe `movimentacoes_portaria` com `horario_chegada` preenchido**. Quando a Logística vincular a carga e a portaria liberar a entrada, o sistema vai cair no caminho "criar nova movimentação" e usar `created_at` do `veiculos_esperados` como aproximação do `horario_chegada` (já está implementado em `useVeiculosEsperados.ts` linha 198). Então **para o Marcelo, o horário de chegada ficará 29/04 23:12 UTC** (≈ 20:12 BRT), que é quando a portaria registrou a chegada dele. Está correto.

## Ações propostas

### 1. Backfill de `movimentacoes_portaria` para chegadas walk-in legadas
Migração que, para cada `veiculos_esperados` com `walk_in=true` e `status_autorizacao IN ('aguardando_vinculo','autorizado')` que **não tenha** `movimentacoes_portaria` correspondente (mesma placa + criada na mesma janela), insere uma linha:
- `tipo_movimento = 'entrada'`
- `etapa_terceirizado = 'chegada'`
- `horario_chegada = veiculos_esperados.created_at`
- `categoria = 'terceirizado'`
- placa, motorista, carga_id (se houver) copiados

Isso normaliza o histórico e o Marcelo passa a ter a linha "oficial" de chegada com o horário correto.

### 2. Garantia de criação no momento da chegada (defesa em profundidade)
Auditar `useVeiculosEsperados.ts` para garantir que **toda** entrada walk-in (inclusive vinda de cancelamento de finalização, fluxo de retorno etc.) sempre crie a `movimentacoes_portaria` de chegada. Hoje o caminho principal já cria, mas o caminho de "devolver para registro" (linha 544+) só insere `veiculos_esperados` sem a movimentação — adicionar o `INSERT` de `movimentacoes_portaria` também ali.

### 3. Exibir o horário de chegada no card "Aguardando vínculo da Logística"
No `SolicitacoesPendentesPanel.tsx`, mostrar `Chegou às HH:mm (há Xh Ym)` usando o `horario_chegada` da movimentação (ou `created_at` do veículo esperado como fallback). Assim a Logística enxerga há quanto tempo o motorista está esperando vínculo.

## Arquivos a alterar

- `supabase/migrations/<novo>.sql` — backfill descrito em (1)
- `src/hooks/useVeiculosEsperados.ts` — fechar lacuna em (2)
- `src/components/portaria/SolicitacoesPendentesPanel.tsx` — exibir tempo de espera (3)

## Resultado esperado para o Marcelo

Após aplicar:
- Aparece em "Aguardando vínculo" com badge `Chegou às 20:12 (há Xh)`.
- Logística vincula a carga → ele migra pra "Aguardando entrada no pátio" sem perder o `horario_chegada` original.
- Portaria libera entrada → `horario_entrada` registrado, vai pro "Pátio Atual".
- Saída final → `horario_saida_final` registrado e aparece no histórico com **tempo total real** desde 20:12.
