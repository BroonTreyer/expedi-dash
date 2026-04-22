

## Problema

No fluxo de Carga Própria, o caminhão fica preso na etapa **"Chegou"** quando a portaria deixou o motorista sair sem registrar a etapa **"Saída p/ Rota"** (que exige foto do painel/KM + KM Inicial obrigatórios). Sem esses campos não dá pra avançar para Retorno/Lacre, e o registro fica travado para sempre.

Hoje o `EditMovimentoDialog` (admin) **edita campos de texto/número** (incluindo `km_inicial` e `etapa_carga_propria`), mas **não permite anexar/substituir as fotos depois** — e a etapa `saida_rota` no fluxo normal força foto obrigatória do painel.

## Solução proposta

Adicionar uma opção de **"Liberar etapa sem foto" (modo regularização)** restrita a **admin / logística**, para destravar registros onde a portaria esqueceu de capturar a foto. Sem inventar feature nova — é a saída regularizada que o operacional já faz hoje no Excel.

### Como vai funcionar

1. No diálogo de **Saída p/ Rota** (e nas etapas Retorno/Lacre, mesmo problema pode acontecer), quando o usuário for **admin ou logística**, aparece um checkbox:
   > ☐ **Regularizar sem foto** (a portaria esqueceu de capturar — registrar motivo)

2. Ao marcar:
   - O campo `foto_painel_url` (e `km_inicial` na etapa saída p/ rota / `foto_lacre_url` no lacre) **deixa de ser obrigatório**.
   - Aparece um campo **obrigatório**: "Motivo da regularização" (textarea curta).
   - O motivo é gravado em `observacoes` com prefixo `[REGULARIZADO por <usuário> em <data>: <motivo>]`, mantendo rastreabilidade.
   - A etapa avança normalmente (registra horário, atualiza `etapa_carga_propria`).

3. **Portaria comum não vê o checkbox** — continua obrigada a tirar foto no fluxo normal. Só admin/logística regulariza.

4. No `MovimentoDetailsDialog` o registro mostra um badge discreto **"Regularizado"** quando tiver o prefixo nas observações, pra diretoria saber que aquele KM/lacre não tem evidência fotográfica.

### Por que essa abordagem (e não outras)

- **Não remover a obrigatoriedade pra todo mundo**: a foto do painel é a única forma de auditar KM rodado. Tirar a obrigatoriedade geral acaba com o controle.
- **Não criar tela nova de "regularização"**: encheria o sistema. O admin já abre o registro travado; basta marcar o checkbox no mesmo lugar onde tentaria avançar.
- **Não bypass silencioso**: o motivo + autor + data ficam gravados — diretoria/auditoria conseguem identificar e cobrar a portaria que deixou passar.

## Arquivos afetados

- ✏️ `src/components/portaria/RegistroMovimentoDialog.tsx` — adicionar checkbox "Regularizar sem foto" (admin/logística), campo motivo, e ajustar validação (`validateForm`) para pular `foto_painel_url`/`foto_lacre_url`/`km_inicial` quando marcado. Concatenar prefixo em `observacoes` antes de salvar.
- ✏️ `src/components/portaria/MovimentoDetailsDialog.tsx` — mostrar badge "Regularizado" quando `observacoes` contém o prefixo `[REGULARIZADO`.

Sem mudança de banco, sem migration. É correção pontual do ponto exato onde o sistema trava.

## Pergunta única antes de implementar

O caminhão do print (placa **GZM1D96**, ERIK) — quando você marcar "Regularizar sem foto" na **Saída p/ Rota**, vai precisar informar **KM Inicial manualmente** ou também libera o KM Inicial? Recomendo **manter KM Inicial obrigatório (digitado à mão)** — sem KM não dá nem pra calcular KM rodado depois. Confirma?

