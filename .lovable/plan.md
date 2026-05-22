## Diagnóstico — EDIVAR ROTA

Confirmei no banco:
- `carregamentos_dia`: `data = 2026-05-21`, `etapa = logistica`, `status = Carregado`, `transportadora = MOREIRA` (terceirizada).
- `movimentacoes_portaria`: 1 movimento de **entrada** em 21/05 18:40, `etapa_terceirizado = no_patio`, **`horario_saida_final = NULL`** (caminhão ainda no pátio).

A regra `computeDataEfetivaTerceirizada` já existe: quando é terceirizada e **não tem saída registrada**, ela deveria aparecer em **hoje** (22/05) até a portaria registrar a saída.

**Bug:** essa regra só é aplicada nos grupos que já foram carregados na lista `rawData`. A carga do Edivar nunca entra na lista quando o filtro é "hoje" porque:
1. Query principal só pega `data = hoje` ou (`data < hoje` E `status ≠ Carregado`). Edivar tem `data=21` e `status=Carregado` → excluída.
2. Carry-over por movimentação de portaria filtra `data_hora` de **hoje**. Movimento do Edivar é de 21/05 → excluído.
3. Carry-over por saída de portaria exige `horario_saida_final NOT NULL`. Edivar tem null → excluída.

Por isso ela só aparece se o usuário voltar o filtro pra 21/05, e nesse dia.

## Correção

Adicionar uma **4ª regra de carry-over** em `src/pages/Consolidado.tsx` (logo após o bloco "Data efetiva" — linhas 120–161):

Quando `isSingleDay && dateFrom === todayStr`:
- Buscar em `movimentacoes_portaria` cargas com:
  - `categoria = 'terceirizado'`
  - `horario_entrada IS NOT NULL` (já entrou no pátio)
  - `horario_saida_final IS NULL` (ainda não saiu)
  - `horario_entrada >= hoje - 7 dias` (janela de segurança contra registros muito antigos esquecidos)
- Pegar os `carga_id` distintos que ainda não estão em `rows`, fazer `fetchAllPaginated` em `carregamentos_dia` com `carga_id IN (...)`, `etapa ≠ pre_carga`, `data < dateFrom`, `data >= 30 dias atrás`, e anexar a `rows`.

Como `computeDataEfetivaTerceirizada` já desloca a `data` para hoje quando `saida = null`, o grupo vai aparecer no consolidado de hoje automaticamente — sem mexer em mais nada.

## Fora do escopo
- Não mexer em `data-efetiva.ts` (a regra já está correta).
- Não alterar `useStatusPortariaPorCarga` nem a query principal.
- Não mexer em cargas próprias — a regra continua só para terceirizadas.
- Não alterar a `data` no banco — o deslocamento permanece só visual.
