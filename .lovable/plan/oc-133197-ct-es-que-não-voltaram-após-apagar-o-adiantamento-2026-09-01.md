# OC 133197 — CT-es que "não voltaram" após apagar o adiantamento

## O que aconteceu (confirmado no banco)

- O botão **"Apagar selecionados"** na aba de adiantamentos não apenas apaga o adiantamento: ele **apaga também os CT-es vinculados** (função `useDeleteAdiantamentosComCtes`). O aviso de confirmação diz isso, mas o texto é fácil de passar despercebido quando a intenção é só desfazer o adiantamento.
- Resultado: os CT-es da OC 133197 foram excluídos junto com o adiantamento. Em seguida você reimportou os PDFs às 17:05–17:06 (horário de Brasília) — hoje existem **27 CT-es** da OC 133197 (1536 a 1561 e 1567), todos com status `vinculado` e **nenhum preso a adiantamento ativo**. Os 5 adiantamentos órfãos criados às 16:52 estão cancelados.
- Ou seja: tudo que está no banco hoje está disponível para gerar o adiantamento. Se algum CT-e ainda falta na tela, é porque ele **não foi reimportado** após a exclusão (não há como recuperar do banco — a exclusão de CT-e é definitiva e não fica registrada no log de auditoria).

## O que vou fazer

1. **Separar "Cancelar" de "Apagar"**
   - Ação principal nas listas de adiantamentos passa a ser **"Cancelar adiantamento"** (mantém os CT-es, que voltam a ficar disponíveis).
   - "Apagar adiantamento + CT-es" vira uma ação secundária, com confirmação que lista os números dos CT-es que serão excluídos e exige digitar `APAGAR`.

2. **Log de auditoria para CT-es**
   - Registrar criação/exclusão em `ctes_dacte` no `audit_log` (número, série, transportadora, OC, valor), para que num próximo caso seja possível saber exatamente quais CT-es sumiram e reimportar só eles.

3. **Conferência da OC 133197**
   - Após a implementação, listar na tela de disponíveis os 27 CT-es acima. Você confere contra os PDFs originais; se faltar algum número, basta reimportar aquele PDF (a trava de duplicidade impede repetir os que já existem).

## Detalhes técnicos

- `src/components/logistica/AdiantamentosTab.tsx`: trocar os botões "Apagar selecionados" (linhas ~1112, ~1156, ~1312) por "Cancelar selecionados" usando `useCancelarAdiantamento` em lote; mover a exclusão com CT-es para um menu secundário com diálogo de confirmação forte (lista de `numero_cte` + confirmação por texto).
- `src/hooks/useAdiantamentos.ts`: adicionar `useCancelarAdiantamentosLote(ids)`; manter `useDeleteAdiantamentosComCtes` apenas para a ação explícita.
- Migração: trigger `audit_ctes_dacte()` (SECURITY DEFINER, mesmo padrão de `audit_generic_cadastro`) em INSERT/DELETE/UPDATE de `ctes_dacte`, gravando em `audit_log` com `entity_type = 'ctes_dacte'`.
- Nenhuma alteração de dados é necessária na OC 133197: o banco já está consistente.
