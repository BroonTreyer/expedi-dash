
## Diagnóstico

O botão de excluir pedido está oculto para o perfil **logística** em `CarregamentoTable.tsx`:

- Linha 108 (mobile): `const canDelete = isAdmin || isFaturamento;`
- Linha 298 (desktop): `const canDelete = isAdmin || isFaturamento;`

A RLS do banco já permite DELETE para `admin`, `logistica` e `faturamento` (corrigido na rodada anterior). O bloqueio é puramente de UI — o botão da lixeira nunca renderiza para logística.

## Plano

### Mudança em `src/components/dashboard/CarregamentoTable.tsx`
- Linha 108: `const canDelete = isAdmin || isFaturamento || isLogistica;`
- Linha 298: `const canDelete = isAdmin || isFaturamento || isLogistica;`

### Sem mudanças
- RLS (já permite os 3 perfis)
- `useDeleteCarregamento`, hooks de mutação
- Outros componentes (Consolidado, Rupturas) — verificarei rapidamente se aplicam o mesmo gating; se sim, replico a correção lá também.

### Memória
Atualizar `mem://auth/role-management` para refletir que **logística + faturamento + admin** podem excluir pedidos (paridade total nas operações de exclusão de carregamentos).

## Arquivos
- ✏️ `src/components/dashboard/CarregamentoTable.tsx` — incluir `isLogistica` em `canDelete` (mobile e desktop)
- ✏️ (se aplicável) componentes de Consolidado/Rupturas com gating análogo
- ✏️ `mem://auth/role-management` — refletir paridade de delete
