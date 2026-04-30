
# Auditoria completa do sistema — diagnóstico e plano de correção

Após varredura rigorosa do banco, das edge functions, dos hooks e das páginas, encontrei a **causa raiz** de boa parte dos bugs que você vem corrigindo manualmente, além de várias inconsistências menores. Resumo abaixo, depois o plano de correção em fases.

---

## 🔴 PROBLEMAS CRÍTICOS encontrados

### 1. **Triggers DUPLICADOS no banco** (causa #1 dos bugs)
Existem pares de triggers fazendo a mesma coisa em várias tabelas. Cada operação dispara **2 vezes** — gera notificações duplicadas, audit_log duplicado, e em alguns casos efeitos colaterais reentrantes.

| Tabela | Trigger A | Trigger B (duplicado) |
|---|---|---|
| `caminhoes` | `audit_caminhoes_trigger` | `trg_audit_caminhoes` |
| `clientes` | `audit_clientes_trigger` | `trg_audit_clientes` |
| `motoristas` | `audit_motoristas_trigger` | `trg_audit_motoristas` |
| `produtos` | `audit_produtos_trigger` | `trg_audit_produtos` |
| `vendedores` | `audit_vendedores_trigger` | `trg_audit_vendedores` |
| `veiculos_esperados` | `audit_veiculos_esperados_trigger` | `trg_audit_veiculos_esperados` |
| `movimentacoes_portaria` | `audit_movimentacoes_trigger` | `trg_audit_movimentacoes` |
| `movimentacoes_portaria` (entrada) | `trg_entrada_portaria` | `trg_on_entrada_portaria` |

**Evidência no banco**: nas últimas 6 horas, os mesmos `entity_id` aparecem 4 a 6 vezes no audit_log com timestamps a segundos de distância. Isso explica o "spam" de notificações que você provavelmente vem vendo na sineta.

### 2. **Dados órfãos / inconsistentes acumulados**
Levantamento direto na produção:
- **141 `veiculos_esperados`** apontam para `carga_id` que **não existe mais** em `carregamentos_dia` (carga foi excluída/cancelada e o esperado ficou pendurado — provavelmente o motivo do "Fabricio" do início do dia ainda aparecer em pátio/expedição em alguns casos).
- **14 movimentos de entrada** sem `horario_chegada` preenchido (dados inconsistentes do fluxo de duas etapas).
- **14 cargas próprias** com entrada registrada sem `etapa_carga_propria` definida (caem fora dos painéis).
- **1 caso atual** de placa duplicada no pátio (mesma placa, mesmo dia, 2 entradas abertas sem saída).
- **69 rupturas sinalizadas sem motivo preenchido**.

### 3. **Conflito Auth / role**
- `useAuth.ts` tem **timer de segurança de 8s** que força `loading=false` mesmo sem role — em rede ruim, o usuário entra "sem perfil" e bate em `Acesso não permitido` por engano.
- Grace period de 2,5s + retries com timeout de 12s **somam até 14s** de espera percebida em login lento.
- `useSession` é exportado mas pouco usado fora de hooks já corretos; algumas queries em componentes podem não respeitar `enabled: !!session` (verificar caso a caso).

### 4. **Bug de UI confirmado pelo console**
`RegistroMovimentoDialog` causa warning React: *"Function components cannot be given refs"* — o `DialogFooter` interno está recebendo `ref` indevido (provavelmente um `<Button asChild>` ou `forwardRef` faltando em um filho). Não quebra, mas indica componente mal montado.

### 5. **Trigger `on_carga_fechada` reentrante**
Quando a carga fecha, ele insere em `veiculos_esperados`. Como existe trigger duplicado de auditoria em ambas as tabelas, cada fechamento gera múltiplos eventos de notificação para portaria/logística — **provavelmente o motivo de notificações repetidas**.

---

## 🟡 PROBLEMAS MÉDIOS

### 6. **42 warnings de SECURITY DEFINER** no linter
Funções `SECURITY DEFINER` no schema `public` estão executáveis por `anon`/`authenticated`. A maioria é segura porque valida internamente, mas `get_portal_data_public` e `get_portal_token_public` são as únicas que **devem mesmo** ser anônimas. Para as outras, precisa `REVOKE EXECUTE FROM anon` e quando aplicável `FROM authenticated`.

### 7. **Edge function `create-user` — falha em cascata**
Já corrigida com `ON CONFLICT` no `handle_new_user`, mas a função não faz **rollback** do `auth.users` se a inserção do role falhar — usuário "fantasma" pode ficar criado na auth sem registro útil. Falta tratamento `try/catch` com `admin.deleteUser` em caso de erro pós-criação.

### 8. **136 usos de `as any` / `: any`** (sem checagem de tipo)
Concentrados em: `motorista-export.ts`, `Logs.tsx`, `useVendedores.ts`, `EditarPedidoAprovacaoDialog.tsx`, `NovoPedidoDialog.tsx`. Cada um é um vetor potencial de runtime error invisível ao TS.

### 9. **Realtime sem singleton em vários hooks**
`useMovimentacoesPortaria`, `useCarregamentos`, `useStatusPortariaPorCarga`, `useMotoristasPainel`, `Consolidado.tsx`, `SolicitacoesPendentesPanel`. Cada hook cria o próprio canal — se montado em duas páginas/abas, dobra o tráfego e pode causar "ghost subscriptions" após HMR. Já existe padrão singleton em `useNotifications` (referência).

### 10. **Cache `staleTime` desigual**
Variando de 0 (default) a 5 min. Sem padrão claro causa: dados frescos demais (refetch constante) ou velhos demais (UI desatualizada após mutação). Falta um padrão por tipo de dado (cadastros = 5min; operacionais = 15-30s).

### 11. **`Index.tsx` com 782 linhas** e **`Consolidado.tsx` com 989 linhas**
Difícil manutenção, alto risco de regressão a cada edição. Boa parte poderia virar hooks/subcomponentes. Não é bug agora, mas é onde **novos bugs vão nascer**.

### 12. **`Rupturas.tsx` 820 linhas + `useCarregamentos.ts` 689 linhas + `useVeiculosEsperados.ts` 627 linhas**
Mesma observação. `useCarregamentos` em particular tem múltiplas mutations interligadas que dificultam rastrear cascatas.

---

## 🟢 PROBLEMAS MENORES

- **Páginas-stub** `PortariaCargaPropria.tsx` e `PortariaTerceirizado.tsx` (5 linhas cada) só re-exportam — ok, mas legado de migração.
- **`PortariaManual.tsx` (45 linhas) + `Portaria.tsx` (468 linhas)** — fluxo "Manual" duplica componentes de Portaria; verificar se ainda é usado.
- **`mem://` desatualizado** em alguns pontos (ex.: ainda diz "Rupturas tracked via DB trigger" — sim, existe, mas o `motivo` ficou opcional na prática).
- **`profiles` sem validação de email no INSERT** (vem do auth, ok, mas trigger não valida formato).
- **Sem índice composto óbvio** em `(carga_id, data)` em `carregamentos_dia` — auditar performance.

---

## 📋 PLANO DE CORREÇÃO — 4 FASES

### Fase 1 — **Correções críticas no banco** (alto impacto, baixo risco)
1. **Migration**: dropar todos os triggers duplicados (manter apenas o de prefixo `trg_`).
2. **Migration de limpeza de órfãos**:
   - Desvincular `veiculos_esperados.carga_id` quando a carga não existe (ou marcar `status_autorizacao='cancelado'`).
   - Setar `etapa_carga_propria='chegou'` por inferência onde NULL com `horario_entrada` preenchido.
   - Resolver duplicata atual de placa em pátio (manter o mais recente, encerrar o anterior).
3. **Migration**: revogar `EXECUTE` de funções `SECURITY DEFINER` para `anon`, exceto `get_portal_*_public`.
4. Adicionar índice em `carregamentos_dia(carga_id)` se não existir.

### Fase 2 — **Robustez de Auth e edge functions**
1. Reduzir timeout de role fetch para 5s e o safety timer para 4s — UX mais rápida em rede ruim.
2. `create-user`: envolver em try/catch e rollback (`admin.deleteUser`) se inserção de role/perfil falhar.
3. Validar inputs com Zod no `create-user`.
4. Adicionar middleware comum de CORS/JWT validation reutilizável entre edge functions.

### Fase 3 — **Realtime e cache padronizados**
1. Singleton de canal Supabase (padrão já em `useNotifications`) aplicado a `useMovimentacoesPortaria`, `useCarregamentos`, `useStatusPortariaPorCarga`, `Consolidado`, `useMotoristasPainel`.
2. Constantes centralizadas: `CACHE_TIMES.CADASTRO=5min`, `OPERACIONAL=20s`, `REALTIME=10s`. Aplicar em todos os hooks.
3. Debounce padronizado de 1.5s em invalidações disparadas por realtime (já é regra de memória — auditar onde falta).

### Fase 4 — **Qualidade de código** (sem mudar comportamento)
1. Eliminar os `as any` críticos (Logs, NovoPedidoDialog, EditarPedidoAprovacaoDialog, motorista-export, useVendedores) — substituir por tipos corretos vindos de `integrations/supabase/types.ts`.
2. Corrigir warning do `RegistroMovimentoDialog` (envolver filho problemático com `forwardRef` ou remover ref).
3. Extrair sub-hooks de `useCarregamentos.ts` (ex.: `useCarregamentosMutations`, `useCarregamentosQueries`).
4. Extrair painéis grandes de `Index.tsx` e `Consolidado.tsx` em componentes próprios — sem mudança visual, só reorganização.
5. Atualizar `mem://` com decisões desta auditoria.

---

## 🎯 O que eu recomendo fazer AGORA

A **Fase 1** sozinha já vai eliminar a maior parte dos sintomas que você descreveu (notificações duplicadas, "fantasmas" na expedição/portaria, audit_log inflado, comportamentos inconsistentes ao fechar carga). É segura: só drop de triggers redundantes + UPDATE controlado em registros órfãos.

Se aprovar, executo **Fase 1 inteira numa única migration revisável** e te mostro o diff antes de aplicar. Depois seguimos para Fase 2 → 3 → 4 conforme prioridade.

**Pergunta rápida antes de mergulhar:** quer que eu execute Fase 1 + Fase 2 juntas (mais impacto, mesmo dia), ou prefere ir uma por vez para validar?
