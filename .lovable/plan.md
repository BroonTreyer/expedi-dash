# Destravar adiantamento da OC 133197 (Moreira) e impedir registros órfãos

## O que foi encontrado

- Existem **5 adiantamentos pendentes órfãos** para a OC 133197 (ADT-20260901-001 a 005), todos criados às 16:52 de hoje pelo usuário `logistica`, cada um com "1 CT-e" declarado mas **nenhum CT-e vinculado** de fato (tabela de vínculo vazia).
- A geração no modo **Individual** cria 1 adiantamento por CT-e. O cabeçalho foi salvo, mas o vínculo com o CT-e falhou. O código tenta desfazer apagando o cabeçalho, porém a **regra de acesso só permite apagar adiantamentos para administradores** — o usuário `logistica` não pode. O desfazer falhou em silêncio e os 5 registros ficaram para trás.
- Pelo mesmo motivo o botão "Apagar" não funciona para você: a exclusão de `adiantamentos_frete` é restrita a admin.
- A trava anti-duplicidade (mesma OC + transportadora + mesmo valor) enxerga esses órfãos como adiantamentos válidos e bloqueia a nova geração (ex.: CT-e 1566 = R$ 2.570,40 bate com o ADT-001).

## O que será feito

### 1. Correção imediata dos dados
- Cancelar os 5 adiantamentos órfãos da OC 133197 (ADT-20260901-001..005). Os 32 CT-es continuam livres para gerar o adiantamento novamente (Individual ou Lote).

### 2. Permitir que Logística apague adiantamentos pendentes
- Ajustar a regra de acesso: `logistica` pode apagar adiantamentos com status **pendente**; `admin` continua podendo apagar qualquer status.
- Na tela, mostrar mensagem clara quando a exclusão for negada (em vez de falhar sem explicação).

### 3. Criação atômica (não deixa mais órfão)
- Criar uma função no banco que gera número, insere o cabeçalho e os vínculos de CT-e **em uma única transação**: se qualquer parte falhar, nada é gravado.
- O hook `useCriarAdiantamento` passa a chamar essa função em vez de fazer 3 passos separados no navegador.

### 4. Trava anti-duplicidade mais inteligente
- Ignorar adiantamentos que não têm nenhum CT-e vinculado (órfãos) ao verificar duplicidade por OC.
- Exibir no painel de integridade os órfãos existentes com ação "Cancelar" direta.

## Detalhes técnicos

- **Dados:** `UPDATE adiantamentos_frete SET status='cancelado' WHERE numero IN ('ADT-20260901-001',…,'005')` (via run_sql).
- **Migração:** nova policy DELETE em `adiantamentos_frete` — `has_role(admin) OR (has_role(logistica) AND status='pendente')`; função `criar_adiantamento(payload jsonb) RETURNS adiantamentos_frete` (security definer, valida roles admin/logistica, gera número via `next_adiantamento_numero`, insere header + `adiantamentos_frete_ctes`, revalida duplicidade de CT-e dentro da transação).
- **Frontend:** `src/hooks/useAdiantamentos.ts` — `useCriarAdiantamento` chama o RPC; guard por OC filtra `adiantamentos_frete_ctes` count > 0; `useDeleteAdiantamentosComCtes` trata erro de permissão com mensagem clara. `src/components/logistica/AdiantamentosTab.tsx` — alerta de órfãos com botão cancelar.
