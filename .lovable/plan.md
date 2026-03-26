

# Auditoria Completa do Projeto — Etapa 1 de 2

Auditoria linha por linha de todas as paginas, componentes e hooks. Separada em duas etapas por volume.

---

## ETAPA 1 — Paginas Principais + Dashboard + Componentes Core

---

### 1. CONSOLE ERROR — `DeleteConfirmDialog` recebe ref indevida

**Arquivo:** `src/components/dashboard/DeleteConfirmDialog.tsx`
**Problema:** O console mostra `Function components cannot be given refs`. O `DeleteConfirmDialog` e o componente interno e o `AlertDialog` de Radix tenta passar ref. O componente é function component sem `forwardRef`.
**Severidade:** Warning (console poluido, UX degradada em dev)
**Correção:** Envolver o componente com `forwardRef`.

---

### 2. CONSOLE ERROR — `StatusSelect` recebe ref indevida

**Arquivo:** `src/components/dashboard/StatusSelect.tsx`
**Problema:** Mesmo problema — `StatusSelect` em `CarregamentoTable` recebe ref do Radix mas nao tem `forwardRef`.
**Severidade:** Warning
**Correção:** Envolver com `forwardRef`.

---

### 3. BUG — `Rupturas.tsx` busca nao filtra por vendedor/nome corretamente

**Arquivo:** `src/pages/Rupturas.tsx` linhas 70-73
**Problema:** O filtro `busca` verifica `nome_produto`, `codigo_produto` e `cliente`. Mas nao inclui `nome_carga`, `codigo_cliente`, nem `vendedores.nome_vendedor`. Buscar pelo nome do vendedor nao retorna resultados.
**Severidade:** Media
**Correção:** Expandir busca para incluir `c.nome_carga`, `c.codigo_cliente`.

---

### 4. BUG — `Rupturas.tsx` nao tem date picker na barra de filtros superior

**Arquivo:** `src/pages/Rupturas.tsx` linhas 391-416
**Problema:** O date picker fica **abaixo** do bloco "Cargas Fechadas com Pendencia" e **abaixo** dos KPIs. O usuario precisa scrollar para ver os filtros. Layout confuso: KPIs > Resumo por Produto > Cargas com Pendencia > Filtros > Tabela.
**Severidade:** UX Alta
**Correção:** Mover os filtros (date picker, vendedor, carga, busca) para **antes** dos KPIs, logo abaixo do header.

---

### 5. BUG — `Rupturas.tsx` indentation inconsistente gera layout quebrado

**Arquivo:** `src/pages/Rupturas.tsx` linhas 305-306
**Problema:** Indentacao com 3 espacos (`   )}`) em vez de 4, causa warnings de formatacao. Nao quebra funcionalidade mas inconsistente.
**Severidade:** Baixa (code quality)

---

### 6. BUG — `Index.tsx` filtro `showLogistica` exclui tudo quando ativo

**Arquivo:** `src/pages/Index.tsx` linhas 117-118
**Problema:** Quando `showLogistica === true`, filtra `c.etapa !== "logistica"` retornando false. Entao so mostra items com `etapa === "logistica"`. Mas os filtros de status/vendedor/etc **continuam aplicados**. Se o usuario tem filtro de status "Carregado" e clica "Ver Logistica OK", pode ver lista vazia. Nao ha feedback explicando isso.
**Severidade:** UX Media
**Correção:** Quando `showLogistica` ativo, resetar filtro de status para "todos" ou mostrar aviso.

---

### 7. BUG — `Index.tsx` nao reseta `selectedIds` ao mudar data

**Arquivo:** `src/pages/Index.tsx`
**Problema:** `selectedIds` persiste entre mudancas de data. Se o usuario seleciona items no dia 25/03 e troca para 26/03, `selectedIds` mantem IDs antigos. O `selectedInView` filtra corretamente, mas o state acumula IDs orfaos indefinidamente.
**Severidade:** Baixa (memory leak leve)
**Correção:** `useEffect` que limpa `selectedIds` quando `dateFromStr`/`dateToStr` muda.

---

### 8. UX — `Consolidado.tsx` nao tem botao "Voltar ao Painel"

**Arquivo:** `src/pages/Consolidado.tsx`
**Problema:** O Index tem botao "Ver Finalizados" que navega para `/consolidado`, mas o Consolidado nao tem botao para voltar. O usuario depende da sidebar.
**Severidade:** UX Baixa

---

### 9. BUG — `Consolidado.tsx` items expandidos perdem estado ao reordenar

**Arquivo:** `src/pages/Consolidado.tsx` linhas 250-257
**Problema:** `expanded` guarda `cargaId`. Quando o usuario ordena por coluna, os groups sao reordenados mas `expanded` mantem os mesmos IDs, correto. Porem ao mudar filtro de UF ou Status, grupos podem desaparecer e `expanded` acumula IDs orfaos.
**Severidade:** Baixa
**Correção:** Limpar `expanded` quando `filtered` muda.

---

### 10. BUG — `Usuarios.tsx` sem `DialogDescription`

**Arquivo:** `src/pages/Usuarios.tsx` linha 182
**Problema:** O Dialog "Criar Usuario" tem `DialogTitle` mas nao `DialogDescription`. Radix requer ambos para acessibilidade. O console pode mostrar warning.
**Severidade:** Acessibilidade
**Correção:** Adicionar `DialogDescription`.

---

### 11. BUG — `Usuarios.tsx` fetch manual sem invalidacao reativa

**Arquivo:** `src/pages/Usuarios.tsx` linhas 104-122
**Problema:** `fetchUsers()` usa `useState` + `useEffect` manual em vez de `useQuery`. Nao tem cache, nao tem invalidacao automatica, nao tem loading/error handling robusto. Se outro admin muda roles simultaneamente, a lista nao atualiza.
**Severidade:** Media
**Correção:** Migrar para `useQuery` com queryKey `["users"]`.

---

### 12. BUG — `Clientes.tsx` upsert com `onConflict` nao tipado

**Arquivo:** `src/pages/Clientes.tsx` linha 94
**Problema:** `supabase.from("clientes").upsert(batch, { onConflict: "codigo_cliente" } as any)` — o `as any` esconde que `codigo_cliente` pode nao ter UNIQUE constraint no banco. Se nao tiver, o upsert falha silenciosamente ou insere duplicatas.
**Severidade:** Potencial bug de dados
**Correção:** Verificar se `codigo_cliente` tem UNIQUE constraint no banco. A tabela `clientes` nao mostra unique constraint no schema fornecido.

---

### 13. BUG — `KanbanView.tsx` nao permite drag-and-drop entre colunas

**Arquivo:** `src/components/dashboard/KanbanView.tsx`
**Problema:** O Kanban renderiza cards por status mas nao implementa drag. O visual sugere interatividade (cards dentro de colunas) mas nao e arrastavel. Pode confundir usuarios.
**Severidade:** UX Media
**Correção:** Ou implementar drag-and-drop para mudar status, ou adicionar botoes de "mover" dentro de cada card.

---

### 14. BUG — `CarregamentoTable.tsx` `handleLoteSubmit` faz N mutacoes sequenciais

**Arquivo:** `src/pages/Index.tsx` linhas 223-228
**Problema:** `handleLoteSubmit` chama `updateMut.mutate(u)` em loop. Cada chamada e uma mutacao separada. Se 20 items sao selecionados, 20 requests separados. Sem batch, sem tratamento de falha parcial.
**Severidade:** Performance Media
**Correção:** Criar um `batchUpdate` no hook que usa uma unica transacao.

---

### 15. SEGURANCA — `carregamentos_dia` DELETE aberto para qualquer autenticado

**Arquivo:** RLS policies de `carregamentos_dia`
**Problema:** A policy de DELETE e `USING (true)` para `authenticated`. Qualquer usuario logado pode deletar qualquer carregamento via API direta. Similar ao problema ja corrigido em `movimentacoes_portaria`.
**Severidade:** Alta
**Correção:** Restringir DELETE a admin usando `has_role(auth.uid(), 'admin')`.

---

### 16. SEGURANCA — `produtos`, `vendedores`, `tipos_caminhao`, `clientes` DELETE aberto

**Arquivo:** RLS policies de todas as tabelas de cadastro
**Problema:** Todas as tabelas de cadastro permitem DELETE para qualquer `authenticated`. Um usuario com role `logistica` pode deletar todos os vendedores via API.
**Severidade:** Alta
**Correção:** Restringir DELETE e INSERT/UPDATE a roles `admin` + `faturamento` conforme UI.

---

### 17. BUG — `useCarregamentos.ts` realtime channel nao depende do dateRange

**Arquivo:** `src/hooks/useCarregamentos.ts` linha 104
**Problema:** O `useEffect` do realtime tem `[queryClient]` como dependencia, nao `[dateFrom, dateEnd]`. Isso significa que o channel e criado uma unica vez. Correto — mas o `invalidateQueries` usa `queryKey: ["carregamentos"]` sem especificar datas, invalidando TODOS os caches de carregamentos. Comportamento OK mas pode causar refetch desnecessario.
**Severidade:** Baixa

---

### 18. BUG — `Auth.tsx` importa asset inexistente potencialmente

**Arquivo:** `src/pages/Auth.tsx` linha 9
**Problema:** `import fricoLogo from "@/assets/frico-logo.png"` — se o arquivo nao existe, o build quebra. Nao vi `src/assets/` na listagem de arquivos. Pode ser que existe mas nao foi listado.
**Severidade:** Potencial build break
**Correção:** Verificar existencia do asset.

---

### 19. UX — `ProtectedRoute.tsx` nao mostra mensagem de "Acesso negado"

**Arquivo:** `src/components/ProtectedRoute.tsx` linha 24
**Problema:** Quando `allowedRoles` nao inclui o role do usuario, redireciona silenciosamente para `/`. O usuario nao sabe por que foi redirecionado.
**Severidade:** UX Baixa
**Correção:** Mostrar toast "Acesso nao permitido" antes de redirecionar.

---

### 20. BUG — `Portaria.tsx` dateRange.to pode ser undefined

**Arquivo:** `src/pages/Portaria.tsx` linha 41
**Problema:** `dateRange.to?.toDateString()` — quando o usuario seleciona range e clica uma unica data, `to` pode ser `undefined` temporariamente. `isToday` pode ser true quando nao deveria.
**Severidade:** Baixa (edge case)

---

## ETAPA 1 — Resumo de Prioridades

| # | Tipo | Severidade | Arquivo Principal |
|---|---|---|---|
| 15 | SEGURANCA | CRITICA | RLS carregamentos_dia |
| 16 | SEGURANCA | CRITICA | RLS cadastros |
| 12 | BUG DADOS | ALTA | Clientes.tsx (upsert) |
| 4 | UX | ALTA | Rupturas.tsx (layout filtros) |
| 1 | CONSOLE | MEDIA | DeleteConfirmDialog.tsx |
| 2 | CONSOLE | MEDIA | StatusSelect.tsx |
| 3 | BUG | MEDIA | Rupturas.tsx (busca) |
| 6 | UX | MEDIA | Index.tsx (showLogistica) |
| 11 | BUG | MEDIA | Usuarios.tsx (fetch manual) |
| 13 | UX | MEDIA | KanbanView.tsx |
| 14 | PERF | MEDIA | Index.tsx (batch update) |
| 7 | MEMORIA | BAIXA | Index.tsx (selectedIds) |
| 8 | UX | BAIXA | Consolidado.tsx |
| 9 | BUG | BAIXA | Consolidado.tsx (expanded) |
| 10 | A11Y | BAIXA | Usuarios.tsx |
| 17 | PERF | BAIXA | useCarregamentos.ts |
| 18 | BUILD | VERIFICAR | Auth.tsx |
| 19 | UX | BAIXA | ProtectedRoute.tsx |
| 20 | BUG | BAIXA | Portaria.tsx |
| 5 | CODE | BAIXA | Rupturas.tsx |

---

A **Etapa 2** cobrira: todos os componentes de dashboard restantes (CarregamentoDialog, FechamentoLoteDialog, RoteirizacaoDialog, RotaMap, CargaPrintDialog, ConsolidadoPrintDialog, RupturasPrintDialog, MultiSelectFilter, EtapaBadge, StatusBadge), todos os componentes de portaria (RegistroMovimentoDialog detalhado, CapturaFoto, PlacaInput, OcrResultado, EvidenciasViewer, PhotoViewerDialog), hooks restantes, e verificacao completa de CSS/responsividade.

Deseja que eu prossiga com a Etapa 2 ou que implemente as correcoes da Etapa 1 primeiro?

