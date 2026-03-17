

## Plano: Corrigir Bug Visual de Role + Robustez do Banco de Dados

### Parte 1: Bug Visual (Flash de conteúdo admin)

**Causa raiz**: Race condition — `loading` vira `false` antes de `fetchRole` terminar. Enquanto `role === null`:
- `ProtectedRoute` renderiza os filhos (não bloqueia)
- `AppSidebar` mostra todos os itens de nav (`!role || ...` = true quando role é null)
- `Index.tsx` renderiza com `isAdmin = false` mas sem restrição real

**Correções (3 arquivos)**:

1. **`src/hooks/useAuth.ts`** — Só setar `loading=false` **depois** de fetchRole resolver. Mudar `fetchRole` para ser awaited nos dois caminhos (onAuthStateChange e getSession). Remover o `setTimeout`.

2. **`src/components/ProtectedRoute.tsx`** — Adicionar guarda: se `user` existe mas `role` é `null`, mostrar loading (rede de segurança).

3. **`src/components/AppSidebar.tsx`** — Trocar filtro de `!role || item.roles.includes(role)` para `role && item.roles.includes(role)` — esconder tudo enquanto role não carregou.

---

### Parte 2: Banco de Dados Robusto para Escala

A tabela `carregamentos_dia` tem 245 registros, zero índices além da PK, e nenhuma FK para `clientes` ou `produtos`. Isso não escala para milhares/anos.

**Migração SQL com as seguintes melhorias**:

1. **Índices de performance** na `carregamentos_dia`:
   - `idx_carregamentos_data` em `(data)` — filtro principal do dashboard
   - `idx_carregamentos_data_status` em `(data, status)` — query de "pendentes de dias anteriores"
   - `idx_carregamentos_vendedor` em `(vendedor_id)`
   - `idx_carregamentos_carga` em `(carga_id)` — agrupamento por carga
   - `idx_carregamentos_etapa` em `(etapa)`
   - `idx_carregamentos_ruptura` em `(data, ruptura)` — tela de rupturas
   - `idx_carregamentos_cliente` em `(codigo_cliente)`
   - `idx_carregamentos_created` em `(created_at)` — ordenação

2. **Foreign keys** para integridade referencial:
   - `codigo_produto` → `produtos(codigo_produto)`
   - `codigo_cliente` → `clientes(codigo_cliente)`

3. **Índices auxiliares nas tabelas de cadastro**:
   - `idx_vendedores_ativo` em `vendedores(ativo)`
   - `idx_clientes_ativo` em `clientes(ativo)`
   - `idx_produtos_ativo` em `produtos(ativo)`
   - `idx_clientes_uf` em `clientes(uf)`

4. **Trigger `updated_at`** — garantir que o trigger de `update_updated_at_column` esteja aplicado na `carregamentos_dia` (se não existir).

5. **Ajustar o código frontend** (`useCarregamentos.ts`) para usar `.range()` como paginação futura e garantir que as queries estejam otimizadas para os novos índices.

### Resumo de Arquivos

| Arquivo | Ação |
|---|---|
| `src/hooks/useAuth.ts` | Await fetchRole antes de loading=false |
| `src/components/ProtectedRoute.tsx` | Guard para role=null com user presente |
| `src/components/AppSidebar.tsx` | Filtrar nav apenas com role definida |
| Migration SQL | 8+ índices, 2 FKs, trigger updated_at |

