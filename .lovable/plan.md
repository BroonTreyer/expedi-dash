

# Auditoria Completa — Nível NASA/Google

## 1. BUGS E ERROS FUNCIONAIS

### 1.1 CRITICO: `today` calculado uma vez no nível do módulo (Index.tsx:27, Rupturas.tsx:21, Consolidado.tsx:24)
`const today = new Date().toISOString().split("T")[0]` — Esse valor fica congelado enquanto a tab estiver aberta. Se o usuário deixar a app aberta durante a virada de meia-noite, a data "hoje" continua sendo ontem. Deve ser computado dinamicamente (ex: dentro de um `useMemo` com intervalo ou recalculado a cada render).

### 1.2 CRITICO: Realtime UPDATE sobrescreve dados de join
Em `useCarregamentos.ts:62-69`, o `setQueriesData` faz `{ ...item, ...updated }`. O payload realtime do Postgres **não inclui** o join `vendedores(nome_vendedor)`. Então após cada UPDATE via realtime, o campo `item.vendedores` é removido (undefined), fazendo o nome do vendedor desaparecer da tabela até o próximo refetch.

### 1.3 MEDIO: Duplicação de `handleStatusChange` no Rupturas
Em `Rupturas.tsx:102-108`, a lógica inclui timestamps para `Carregando`/`Carregado`, mas rupturas usam status diferentes (`Aguardando pedido`, `Romaneio Liberado`, etc.). Esses status nunca serão `Carregando` ou `Carregado`, então o código nunca executa essa lógica — inofensivo mas confuso.

### 1.4 MEDIO: CarregamentoDialog — edição multi-item não funciona
Em `CarregamentoDialog.tsx:153-162`, quando editando, se houver mais de 1 item, o primeiro item envia com `id: editing.id` e os subsequentes são enviados **sem `id`**, o que cria novos registros em vez de atualizar. Isso pode causar duplicações inesperadas.

### 1.5 MEDIO: `useEffect` sem `selectedDate` nas dependências (FechamentoLoteDialog.tsx:66)
O `useEffect` depende de `open` e `items` mas não de `selectedDate`. Se o dialog está aberto e `selectedDate` mudar externamente, o `dataCarregamento` não atualiza.

### 1.6 BAIXO: Carga ID tem colisão potencial
Em `FechamentoLoteDialog.tsx:97-99`, o `cargaId` é `CG-YYYYMMDD-HHMM`. Se dois usuários fecharem cargas no mesmo minuto, terão o mesmo ID. Deveria incluir segundos ou um UUID curto.

### 1.7 BAIXO: `handleUndoCarga` usa Supabase direto sem optimistic update
Em `Index.tsx:181-202`, a operação de desfazer carga chama `supabase.from()` diretamente em vez de usar o mutation hook, sem rollback em caso de erro e sem padrão consistente com o resto da app.

## 2. SEGURANÇA

### 2.1 CRITICO: RLS completamente aberta em tabelas operacionais
Todas as tabelas principais (`carregamentos_dia`, `clientes`, `produtos`, `vendedores`, `tipos_caminhao`) têm RLS com `true` para todas operações e roles `public`. Qualquer pessoa sem autenticação pode ler, inserir, atualizar e deletar TODOS os dados via API direta. Isso é uma vulnerabilidade severa.

### 2.2 MEDIO: `(supabase.auth as any).storage` — manipulação interna
Em `useAuth.ts:34,76,79,99`, o código acessa `supabase.auth.storage` via type cast `as any`. Isso depende de implementação interna do Supabase client e pode quebrar silenciosamente em updates.

### 2.3 BAIXO: Role fallback para "logistica"
Em `useAuth.ts:44`, se o user_roles não encontrar role, retorna `"logistica"`. Um usuário sem role definida terá acesso de logística por padrão — deveria ser o nível mais restritivo ou bloquear acesso.

## 3. PERFORMANCE

### 3.1 MEDIO: KpiCards recria Set a cada render em seleção
Em `Index.tsx:317`, `filtered.filter(c => new Set(selectedInView).has(c.id))` cria um novo Set **inline** em cada render. Deveria usar o `selectedSet` já existente ou um useMemo.

### 3.2 MEDIO: Consolidado expande itens sem virtualização
A tabela do Consolidado renderiza todos os itens expandidos inline. Com muitas cargas abertas simultaneamente, pode causar lag.

### 3.3 BAIXO: `handleLoteSubmit` dispara N mutations sequenciais
Em `Index.tsx:204-208`, para cada pedido numa carga, faz uma mutação individual. Deveria ser um batch update único para evitar N roundtrips ao banco.

### 3.4 BAIXO: Produtos.tsx não tem paginação
Diferente de Clientes e Vendedores que têm PAGE_SIZE=50, Produtos renderiza TODOS os itens de uma vez.

## 4. LAYOUT E RESPONSIVIDADE

### 4.1 MEDIO: Filtros da Rupturas não são responsivos
Em `Rupturas.tsx:209-221`, os filtros usam `flex-wrap gap-3` com larguras fixas (`w-40`, `w-48`). Em telas < 400px, os inputs não cabem bem e não seguem o padrão grid responsivo usado nos Filters do dashboard.

### 4.2 MEDIO: Header do Rupturas não empilha no mobile
Em `Rupturas.tsx:133-153`, o header usa `flex items-center justify-between`. Os botões "Imprimir" e "Novo Pedido (Ruptura)" ficam apertados em telas pequenas e não empilham como nas outras páginas (que usam `flex-col sm:flex-row`).

### 4.3 MEDIO: Kanban não é utilizável no mobile
O `KanbanView` renderiza 6 colunas (`lg:grid-cols-6`). No mobile, mostra 1 coluna de cada vez, mas sem scroll horizontal ou indicação de que há mais colunas — o usuário precisa scrollar muito verticalmente.

### 4.4 BAIXO: `AdicionarCargaDialog` não tem `w-[calc(100vw-2rem)]`
Diferente dos outros dialogs que usam `w-[calc(100vw-2rem)] sm:w-full`, o `AdicionarCargaDialog.tsx:69` usa apenas `max-w-lg`, podendo ficar cortado em telas muito estreitas.

### 4.5 BAIXO: NotFound está em inglês
`NotFound.tsx` exibe "Oops! Page not found" e "Return to Home" — toda a app está em português. Deveria ser traduzido para manter consistência.

### 4.6 BAIXO: Consolidado expande itens com colSpan incorreto
Em `Consolidado.tsx:344`, a row expandida tem 9 `<TableCell>` mas o header tem 9 colunas (1 vazia + 8 com dados). Os dados nos cells expandidos não alinham com os headers corretos (ex: `item.peso` aparece sob "Motorista" em vez de "Peso").

## 5. UX E QUALIDADE

### 5.1 MEDIO: Sem feedback de loading nos botões de submit
Nenhum dos forms (Clientes, Vendedores, Produtos, TiposCaminhao, CarregamentoDialog, FechamentoLoteDialog) desabilita o botão ou mostra spinner durante a mutação. O usuário pode clicar múltiplas vezes, gerando duplicatas.

### 5.2 MEDIO: Sem validação de campos obrigatórios no CarregamentoDialog
O dialog não valida campos antes de submeter. É possível criar um pedido sem vendedor, sem produto, sem peso.

### 5.3 BAIXO: Clientes import não inclui UF
Em `Clientes.tsx:84-89`, o import XLSX mapeia `r[0]` (codigo), `r[1]` (nome), `r[2]` (cidade), mas ignora UF (deveria ser `r[3]`).

### 5.4 BAIXO: Sem debounce nos campos de busca
Os inputs de busca em Clientes, Vendedores, Produtos e Filters fazem filter a cada keystroke. Com listas grandes, pode causar lag.

### 5.5 BAIXO: Consolidado não invalida `carregamentos` cache
Quando o status é alterado no Consolidado (`Consolidado.tsx:120`), invalida `["consolidado", date]` mas NÃO invalida `["carregamentos"]`. Se o usuário voltar ao Dashboard, verá dados desatualizados até o próximo refetch.

## 6. PLANO DE IMPLEMENTAÇÃO (PRIORIZADO)

### Fase 1 — Criticos (segurança e data loss)
1. Corrigir RLS policies para exigir autenticação em todas as tabelas operacionais
2. Corrigir realtime UPDATE para preservar joins (`vendedores`)
3. Corrigir `today` para ser dinâmico

### Fase 2 — Funcionalidade
4. Adicionar loading state e desabilitar botões durante mutations
5. Corrigir alinhamento de colunas no Consolidado expandido
6. Adicionar paginação em Produtos
7. Corrigir import de Clientes para incluir UF
8. Traduzir NotFound para português
9. Invalidar cache `carregamentos` no Consolidado

### Fase 3 — Responsividade e UX
10. Padronizar header e filtros do Rupturas com grid responsivo
11. Corrigir `AdicionarCargaDialog` para mobile
12. Melhorar Kanban para mobile (scroll horizontal ou tabs)
13. Adicionar validação de campos obrigatórios nos forms
14. Usar batch update em vez de N mutations individuais
15. Tornar carga_id único (adicionar segundos ou random suffix)

