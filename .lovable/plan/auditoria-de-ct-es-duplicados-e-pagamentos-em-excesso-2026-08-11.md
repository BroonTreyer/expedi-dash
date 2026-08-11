# Auditoria de CT-es duplicados e pagamentos em excesso

## Diagnóstico (confirmado no banco)

A duplicação é real e vem da **reimportação dos mesmos DACTEs**. Não existe nenhuma trava de duplicidade: a tabela de CT-es não tem índice único por número/série/transportadora, e a tela de importação insere sem verificar se o CT-e já existe. Ao subir o mesmo PDF de novo, o sistema cria um CT-e novo e, em seguida, um adiantamento novo — somando duas vezes o mesmo frete.

Números exatos hoje:

| Item | Valor |
|---|---|
| CT-es duplicados (mesmo nº/série/transportadora) | 11 |
| Valor de frete contado em dobro | R$ 42.720,00 |
| Adiantamentos duplicados gerados | 11 |
| Valor de adiantamento pago em excesso | **R$ 34.176,00** |

Concentração dos casos: reimportação de 04/08 repetindo CT-es já lançados em 03/08.
- OC 132095: CT-es 1233, 1234, 1235, 1236, 1237, 1238, 1239, 1240, 1241, 1335 (10 duplicados)
- OC 132296: CT-e 1338 — R$ 24.000 em dobro (é o caso do print, o lote de 5 mostra 1338 duas vezes)

Todos os adiantamentos duplicados já estão marcados como pago/quitado — por isso o pagamento saiu em excesso.

## Correção dos dados

1. Manter, em cada grupo duplicado, apenas o CT-e mais antigo (o original) e remover os 11 registros repetidos.
2. Remover os 11 adiantamentos gerados a partir dos CT-es repetidos, junto dos vínculos, preservando os adiantamentos originais.
3. Recalcular o cabeçalho (valor total, adiantamento e saldo) de qualquer adiantamento que fique com CT-es a menos.
4. Registrar tudo no log de auditoria, com o valor removido por OC.
5. Gerar em tela/planilha um **relatório de crédito a recuperar** com os 11 casos (OC, CT-e, transportadora, valor pago em excesso) para cobrança da MOREIRA — total R$ 34.176,00.

## Prevenção (para não acontecer de novo)

- **Trava no banco:** índice único de CT-e por número + série + transportadora. Reimportar o mesmo CT-e passa a falhar no banco, não importa por qual tela venha.
- **Detecção na importação:** ao ler os PDFs, o sistema consulta os CT-es já existentes e marca cada arquivo repetido como "JÁ IMPORTADO" (bloqueado, com link para o registro original). O botão salvar ignora esses itens e avisa quantos foram bloqueados.
- **Trava ao montar lote de adiantamento:** impedir incluir CT-e que já pertença a outro adiantamento, e avisar quando a OC já tiver adiantamento pago.
- **Painel de auditoria em Logística:** um card fixo "Duplicidades detectadas" listando CT-es repetidos e OCs com adiantamento pago em duplicidade, para conferência antes de qualquer pagamento.

## Detalhes técnicos

- Migração: `CREATE UNIQUE INDEX` em `ctes_dacte (numero_cte, coalesce(serie,''), upper(btrim(coalesce(transportadora,''))))`; limpeza dos duplicados antes de criar o índice.
- Limpeza de dados via SQL: delete em `adiantamentos_frete_ctes`, `adiantamentos_frete` e `ctes_dacte` dos registros duplicados + recálculo dos cabeçalhos remanescentes.
- `src/components/logistica/ImportarDacteDialog.tsx`: checagem de duplicidade após o parse (consulta por `numero_cte` em lote), novo status `duplicado`, badge e exclusão do save.
- `src/hooks/useCtesDacte.ts`: helper `buscarCtesExistentes(numeros)` e tratamento do erro de índice único com mensagem clara.
- `src/hooks/useAdiantamentos.ts`: validação de CT-e já vinculado a outro adiantamento.
- `src/components/logistica/AdiantamentosTab.tsx` / nova seção na aba CT-es: painel de duplicidades e exportação do relatório de crédito a recuperar.
