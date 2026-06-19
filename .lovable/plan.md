## Causa raiz

`useImportarVeiculosEsperados` (em `src/hooks/useVeiculosEsperados.ts`) deleta os `veiculos_esperados` apenas das **datas** que aparecem na planilha. Só que a tabela tem um índice único global em `carga_id` quando `walk_in = false`:

```
veiculos_esperados_carga_id_unique_previsto  UNIQUE (carga_id)
  WHERE walk_in = false AND carga_id IS NOT NULL
```

A planilha de Varejo "Rotas Liberadas" traz `carga_id = 9763000` para 15/06, mas esse mesmo carga_id já está cadastrado em outra data (18/06). O INSERT da planilha viola o índice, a transação inteira falha e o usuário vê o toast "Erro ao importar veículos esperados".

## Correção principal

Em `useImportarVeiculosEsperados`, antes do `insert`, também apagar quaisquer registros existentes (não-walk-in, status ≠ 'recusado', `conferido = false`) cujo `carga_id` esteja entre os `carga_id`s sendo importados — não só os da mesma data. Isso garante reimportações idempotentes mesmo quando a mesma carga foi previamente prevista para outra data.

Passos no mutationFn:
1. Coletar `cargaIds` distintos não-nulos dos `inserts`.
2. Continuar deletando por `data_referencia` (comportamento atual).
3. Adicionar um delete extra por `in("carga_id", cargaIds)` filtrando `walk_in = false`, `status_autorizacao <> 'recusado'`, `conferido = false`. (Não tocar em cargas já conferidas/expedidas nem em walk-ins.)
4. Executar o `insert` como hoje.

## Melhorias menores na mesma alteração

Em `src/components/portaria/ImportarPlanilhaDialog.tsx`:

- **Toast mais informativo no catch da importação**: mostrar a mensagem real do erro (ex.: `duplicate key value violates unique constraint ...`) em vez de só "Erro ao importar veículos esperados". Já temos `error` no `onError` do mutation — passar `error.message` para o toast.
- **Reconhecimento de grupo no formato "Varejo"**: quando a coluna "AJUDANTES" contiver valor começando por "TRANSP" (ex.: "TRANSP. PEDRO"), tratar essa linha individualmente como terceirizado — populando `transportadora` em vez de `ajudantes`, mesmo com `currentGrupo = "PRÓPRIA"`. Sem isso, a coluna some no banco para a planilha de Varejo.
- **Carga composta com "/"**: se `cargaId` contiver "/", manter como está hoje (texto literal) mas adicionar comentário inline no parser. Não muda comportamento — apenas documenta. (Quem quiser separar pode fazer manualmente depois.)

## Validação

1. Subir a planilha `Rotas Liberadas.xlsx` no botão Importar — deve concluir com toast verde "16 veículos carregados".
2. Conferir no painel da Portaria que a carga 9763000 (ACREUNA) aparece em 15/06 e sumiu de 18/06.
3. Reimportar a mesma planilha — não deve dar erro de duplicidade (idempotência).
4. Conferir uma linha do tipo "TRANSP. PEDRO" — deve aparecer com transportadora preenchida, não como ajudante.