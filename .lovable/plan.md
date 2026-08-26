# Corrigir OC 132296 e bloquear CT-es substituídos

## O que aconteceu

Na OC 132296 (MOREIRA TRANSPORTES E LOG LTDA) existem 4 CT-es lançados:

| CT-e | Frete | Peso | Adiantamento | Saldo |
|---|---|---|---|---|
| 1338 | 24.000,00 | 26.000 | 19.200,00 | 4.800,00 |
| 1339 | 13.440,00 | 0 | 10.752,00 | 2.688,00 |
| 1343 | 6.000,00 | 6.000 | 4.800,00 | 1.200,00 |
| 1344 | 7.440,00 | 0 | 5.952,00 | 1.488,00 |

O CT-e 1339 foi substituído pelo desdobramento em 1343 + 1344 (6.000 + 7.440 = 13.440, exatamente o valor do 1339), mas continuou lançado. Por isso a quitação somou 10.176,00 em vez dos 7.488,00 corretos.

## Correção dos dados

- Cancelar o adiantamento do CT-e 1339 (ADT-20260803-026): status `cancelado`, sem gerar crédito a recuperar (não houve pagamento real), com observação registrando a substituição pelos CT-es 1343/1344.
- Marcar o CT-e 1339 como cancelado/substituído para que ele não volte a entrar em novos adiantamentos nem nos totais da OC.
- Resultado: OC 132296 passa a ter 3 CT-es, frete total 37.440,00, adiantamento 29.952,00 e **saldo a quitar 7.488,00** — igual ao texto de quitação da Moreira.

## Prevenção na importação de CT-e

Na importação de DACTE, antes de salvar, verificar os CT-es já vinculados à mesma Ordem de Carga e mesma transportadora:

- Se o valor do novo CT-e, somado a outro CT-e recém-importado da mesma OC, fechar exatamente (tolerância de centavos) o valor de um CT-e já existente, tratar como possível substituição.
- Também sinalizar quando um CT-e existente da OC tiver valor igual à soma de dois ou mais CT-es novos.
- Nesses casos, **bloquear o salvamento** e exibir um aviso pedindo confirmação explícita: manter o CT-e antigo ou substituí-lo pelos novos. Escolhendo "substituir", o CT-e antigo é cancelado e o adiantamento vinculado a ele também, na mesma ação.

## Aviso na quitação

No diálogo de Registrar Quitação, exibir um alerta quando a OC tiver CT-es cuja soma coincide com o valor de outro CT-e da mesma OC, para evitar quitar valor duplicado antes de a auditoria ser feita.

## Detalhes técnicos

- Dados: `UPDATE` em `adiantamentos_frete` (status `cancelado` + observação) e em `ctes_dacte` (status substituído) para os registros da OC 132296; sem exclusão física, preservando a trilha de auditoria.
- `src/components/logistica/ImportarDacteDialog.tsx`: nova checagem de substituição (consulta dos CT-es da OC/transportadora, comparação de somas com tolerância de R$ 0,02) integrada ao bloqueio de duplicidade já existente, com diálogo de confirmação "manter x substituir".
- `src/components/logistica/RegistrarQuitacaoDialog.tsx`: alerta visual (não bloqueante) quando o padrão de substituição for detectado nos itens do grupo.
- Sem alteração de schema.
