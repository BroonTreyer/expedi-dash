
## Diagnóstico

**Parte 1 — Permissão de delete:**
- RLS atual de `carregamentos_dia` DELETE: apenas `admin` e `logistica`. Falta `faturamento`.
- `useDeleteCarregamento` já trata `count === 0` mostrando erro genérico.

**Parte 2 — Editar carga fechada:**
- `EditarCargaDialog.onSave` chama `onSave(cargaId, { nome_carga, placa, motorista, tipo_caminhao, transportadora }, ids)`. Preciso ver onde está implementado pra confirmar se cascateia para todos os itens da carga.
- Memory existente (`order-cascading-updates`) confirma que multi-item cascade já existe, mas usuário relata que não está propagando ao editar **carga fechada** especificamente.
- Provável causa: o handler de save filtra por `ids` visíveis (após remoções), mas se o painel de edição é chamado a partir do **Consolidado** (cargas fechadas), pode estar usando outro handler que não cascateia.

Preciso explorar:
- `Index.tsx`, `Consolidado.tsx` — onde EditarCargaDialog é montado e como onSave é definido
- Confirmar se ambos os pontos cascateiam para todos os itens com mesmo `carga_id`

## Plano

### 1. Migration — RLS faturamento delete
```sql
DROP POLICY "Admin/logistica delete carregamentos_dia" ON carregamentos_dia;
CREATE POLICY "Ops delete carregamentos_dia" ON carregamentos_dia
FOR DELETE TO authenticated
USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'logistica') OR has_role(auth.uid(),'faturamento'));
```

### 2. Cascade em Editar Carga (fechada e aberta)
No handler `onSave` do `EditarCargaDialog` (em `Index.tsx` e `Consolidado.tsx`):
- Aplicar update em **TODOS** os itens com `carga_id = X` (não só os `ids` visíveis), nos campos compartilhados: `nome_carga`, `placa`, `motorista`, `tipo_caminhao`, `transportadora`.
- Itens removidos da carga (via X) continuam sendo desvinculados individualmente como hoje.
- Usar `useBatchUpdateCarregamento` ou um único `update().eq("carga_id", X)`.

Preferência: `supabase.from("carregamentos_dia").update({...}).eq("carga_id", cargaId)` em uma query — mais rápido e atômico.

### 3. Frontend permissões
- `ProtectedRoute` / botões de delete: garantir que o botão de excluir pedido apareça também para `faturamento` (hoje pode estar gated por role).

### Arquivos
- 🆕 migration — recria policy DELETE incluindo `faturamento`
- ✏️ `src/pages/Index.tsx` — handler `onSave` da carga: 1 update por `carga_id` propagando aos campos compartilhados
- ✏️ `src/pages/Consolidado.tsx` — mesmo cascade no save da carga fechada
- ✏️ Componentes que escondem botão "excluir pedido" por role: incluir `faturamento`
