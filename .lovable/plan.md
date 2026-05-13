## Problema

Em `/portaria/carga-propria` (Varejo), o registro `id=a3ba1b31-d809-4aa4-9531-ca7a899b030b` (rota "Águas lindas", 09:06) ficou com **placa=null** e **motorista=null** mesmo estando "Em Rota". A causa: o fluxo **"Saída p/ Rota"** usa a matriz `VISIBILITY_SAIDA_ROTA` (em `src/lib/portaria-fields-config.ts`, linhas 208–220) que marca **placa, motorista e foto_placa_url como `oculto`** — assumindo que o prefill já trouxe esses dados. Quando o registro de "Chegou" foi criado a partir da aba **Esperados** com a planilha sem essas colunas, o prefill veio vazio, o formulário não pediu, e o UPDATE gravou `null`.

## Correção

Em `src/lib/portaria-fields-config.ts`, ajustar `VISIBILITY_SAIDA_ROTA` para exibir placa, motorista e foto da placa em **carga_propria**:

- `placa`               → `obrigatorio`
- `motorista`           → `obrigatorio`
- `foto_placa_url`      → `opcional` (se a foto já existe da chegada, não força tirar de novo; se não existe, fica disponível)

Mantém o resto da matriz como está (foto_painel_saida_url e km_inicial obrigatórios; rota/peso/qtd_entregas/km_rota/observações opcionais).

O diálogo (`RegistroMovimentoDialog.tsx`, linhas 84–94) já faz o pré-preenchimento de placa/motorista a partir do `prefill`, então casos em que esses dados já existem aparecem preenchidos automaticamente — o operador só precisa confirmar. Casos com prefill vazio agora exigem preenchimento, eliminando o registro fantasma.

## Limpeza pontual

Atualizar o registro existente (`a3ba1b31`) para limpar o estado, ou deixar o admin dar baixa via `/portaria-admin` (já implementado). Pergunto ao usuário se quer que eu corrija a placa/motorista deste registro específico assim que ele me passar os dados.

## Arquivos alterados

- `src/lib/portaria-fields-config.ts` — três entradas em `VISIBILITY_SAIDA_ROTA` para `carga_propria`.

## Validação

1. Abrir um card "Chegou" sem placa → clicar "Saída p/ Rota" → o diálogo agora mostra os blocos **Veículo** (placa + motorista) com asterisco vermelho de obrigatório.
2. Tentar salvar sem preencher → botão fica desabilitado.
3. Preencher placa+motorista, salvar → registro vai para "Em Rota" com os dois campos populados; some o "—" do Pátio Atual.
4. Em cards onde o prefill já trazia placa/motorista (vindo de uma carga fechada vinculada), os campos aparecem preenchidos e o operador só confirma.
