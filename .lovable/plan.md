
Objetivo
- Garantir que o cabeçalho da tabela fique visível durante o scroll vertical.
- Liberar seleção de pedidos (checkbox) com soma baseada apenas nos itens selecionados.

Escopo (sem backend)
- Ajustes somente de UI/estado no frontend:
  - `src/components/dashboard/CarregamentoTable.tsx`
  - `src/pages/Index.tsx`

Plano de implementação

1) Corrigir sticky do cabeçalho (fixo no scroll)
- Em `CarregamentoTable.tsx`, parar de depender de `sticky` no `<TableHeader>` (`thead`) e aplicar sticky em cada `<TableHead>` (`th`), que é a forma mais confiável entre navegadores.
- Aplicar classe única de header (ex.: `sticky top-0 z-30 bg-muted/40 backdrop-blur`) em todas as células do cabeçalho.
- Manter fundo opaco e separação visual (`shadow`/`border`) para o header não “sumir” ao passar sobre as linhas.
- Validar que o proxy de scroll horizontal continue funcionando igual (sem barra duplicada).

2) Tornar pedidos selecionáveis para uso diário
- Em `Index.tsx`, habilitar `selectable` para todos os perfis operacionais da tela (admin, logística e faturamento), não só logística.
- Manter a seleção no modo tabela (kanban continua sem seleção).

3) Somatórios apenas do que foi selecionado
- Em `Index.tsx`, calcular uma lista `selectedInView` (interseção entre `selectedIds` e `filtered`) para evitar contagem de itens fora do filtro atual.
- Usar `selectedInView` para:
  - contador de selecionados,
  - soma de peso selecionado,
  - KPIs com `selectedData`.
- Exibir o bloco de resumo de seleção para qualquer perfil quando houver seleção.
- Limpar IDs inválidos automaticamente quando filtro/data mudar (prune de seleção), para evitar “soma fantasma”.

Detalhes técnicos
- Causa provável do bug atual: `position: sticky` no `thead` não é confiável; `th` sticky é mais estável.
- Não haverá alteração de regras de permissão de edição/status/exclusão; apenas seleção e visualização de soma.
- Sem mudanças de banco, autenticação ou políticas.

Critérios de aceite
- Ao rolar a página para baixo, o cabeçalho da tabela permanece visível o tempo todo.
- Checkboxes aparecem para os perfis definidos no painel principal.
- O total (quantidade/peso/KPI) reflete somente itens selecionados e atualiza corretamente ao filtrar.
- Scroll horizontal continua com apenas a barra proxy inferior, sem regressão visual.
