## Plano: apagar selecionados em Adiantamentos e CT-es

Adicionar botão **"Apagar selecionados"** (vermelho, com confirmação modal mostrando quantidade e impacto) em três lugares, sempre só pra admin/logística/faturamento. Toda exclusão passa por `AlertDialog` com texto "Esta ação não pode ser desfeita".

### 1. Aba CT-es / DACTE (`CtesDacteTab.tsx`)
- Checkbox por linha + checkbox "marcar todos".
- Botão "Apagar selecionados (N)" no header da tabela.
- Usa o hook existente `useDeleteCtesByIds` (já criado em `useCtesDacte.ts`).
- Bloqueio: se algum CT-e já está em adiantamento não cancelado, mostro toast "X CT-es estão vinculados a adiantamentos. Apague o adiantamento primeiro." e cancelo a operação.

### 2. Aba Montar Lote (em `AdiantamentosTab.tsx`)
- Reaproveita o estado `selecionados` que já existe.
- Botão "Apagar CT-es selecionados (N)" ao lado do botão "Gerar adiantamentos".
- Mesma proteção da #1 (CT-es vinculados a ADT não podem ser apagados aqui).

### 3. Abas Pendentes / Aguardando Quitação / Quitados
- Em `ListaAdiantamentos`, junto do botão "Quitar selecionados" (que já existe na aba Aguardando), adicionar **"Apagar selecionados (N)"** disponível nas três abas.
- Conforme sua escolha: apagar o adiantamento **E os CT-es vinculados** juntos.
  - Ordem: `DELETE` em `ctes_dacte` pelos `cte_id` vinculados → `DELETE` em `adiantamentos_frete_ctes` (cascade) → `DELETE` em `adiantamentos_frete`.
  - Tudo numa única `mutation` (`useDeleteAdiantamentosComCtes`) com `invalidateQueries` em `adiantamentos_frete`, `adt_ctes_ativos` e `ctes_dacte`.
- Modal de confirmação mostra: "Vai apagar **X adiantamentos** e **Y CT-es vinculados**. Esta ação não pode ser desfeita."

### Detalhes técnicos
- Novo hook `useDeleteAdiantamentosByIds` em `useAdiantamentos.ts` que faz o cascade controlado (ctes_dacte → adiantamentos_frete; o link `adiantamentos_frete_ctes` cai junto via FK cascade existente).
- RLS atual de `adiantamentos_frete` e `ctes_dacte` já permite `DELETE` para roles autorizadas — sem migração.
- Não vou tocar em `audit_log`; deleções já são registradas se houver trigger.

### Fora do escopo
- Lixeira / restore para adiantamentos (continua sendo deleção permanente, como o resto do sistema).
- Limitar quem pode apagar adiantamentos `quitado` por permissão extra (continua aberto a admin/logística/faturamento como hoje).
