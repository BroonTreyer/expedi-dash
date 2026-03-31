

# Auditoria Completa do Sistema ExpediDash

Devido ao tamanho do sistema, a auditoria esta dividida em 5 partes temáticas. Cada parte lista os problemas encontrados com severidade e correção proposta.

---

## PARTE 1 — Segurança e Autenticação

### 1.1 CRÍTICO: RLS muito permissiva em tabelas de cadastro
**Tabelas afetadas:** `carregamentos_dia`, `produtos`, `vendedores`, `clientes`, `tipos_caminhao`, `veiculos_esperados`, `movimentacoes_portaria`

INSERT e UPDATE usam `WITH CHECK (true)` — qualquer usuario autenticado pode inserir/atualizar qualquer registro, independente do role. Um usuario "portaria" pode criar produtos, vendedores, clientes etc.

**Correção:** Restringir INSERT/UPDATE com `has_role()` para permitir apenas roles autorizados. Ex: produtos/vendedores/clientes so admin+faturamento; carregamentos so admin+faturamento+logistica.

### 1.2 CRÍTICO: `veiculos_esperados` DELETE sem restrição
A policy de DELETE usa `USING (true)` — qualquer usuario autenticado pode deletar todos os veículos esperados. Deveria ser restrito a admin+logistica.

### 1.3 ALTO: `Usuarios.tsx` — handleRoleChange sem validação server-side
O frontend faz `DELETE` + `INSERT` na tabela `user_roles` diretamente. Embora a RLS limite a admins, o padrão de deletar e re-inserir pode causar race condition (momento sem role). Deveria usar `upsert` ou uma função server-side.

### 1.4 ALTO: `create-user` edge function usa `getUser()` ao invés de `getClaims()`
A função usa `anonClient.auth.getUser()` para autenticar o chamador, fazendo uma chamada de rede extra. Deveria usar `getClaims()` para validar o JWT localmente.

### 1.5 MÉDIO: `ocr-portaria` não valida autenticação
A edge function aceita qualquer requisição sem verificar JWT. Qualquer pessoa com o anon key pode chamar o OCR e consumir creditos do Plate Recognizer.

### 1.6 MÉDIO: OCR base64 pode causar OOM
Em `ocr-portaria`, a função baixa a imagem inteira em memória e converte para base64 com `btoa(String.fromCharCode(...new Uint8Array(imgBuffer)))`. Para imagens grandes (>5MB), isso pode estourar a memória da edge function.

### 1.7 BAIXO: Falta input validation nos formulários de cadastro
Produtos, vendedores, clientes não validam comprimento, caracteres especiais ou injeção. Embora o Supabase previna SQL injection, dados malformados podem ser inseridos.

---

## PARTE 2 — Bugs Funcionais e Lógica de Negócio

### 2.1 ALTO: Produtos query sem paginação — limite de 1000 rows
`useProdutos` faz `supabase.from("produtos").select("*")` sem paginação. Se houver mais de 1000 produtos, os excedentes serão silenciosamente omitidos. O mesmo ocorre com `useVendedores` e `useTiposCaminhao`.

**Nota:** `useClientes` implementa paginação corretamente (loop com `range()`).

**Correção:** Aplicar o mesmo padrão de paginação do `useClientes` nos hooks de produtos e vendedores.

### 2.2 ALTO: `Consolidado.tsx` — linhas expandidas com colSpan incorreto
O header tem 13 colunas, mas as linhas expandidas usam `colSpan={2}` em posições que não batem. Isso causa desalinhamento visual nas colunas dos itens expandidos.

### 2.3 MÉDIO: Console warning — "Function components cannot be given refs"
O log mostra warnings em `Consolidado.tsx` e `ConsolidadoPrintDialog.tsx`. O `Popover` dentro de `TableCell` tenta passar ref a um componente funcional. Não quebra funcionalidade mas polui o console.

### 2.4 MÉDIO: `Portaria.tsx` linhas 348-352 — Limpar lista usa `onClear` como `undefined` ao invés de omitir
Quando `isPortaria` é true, `onClear` é `undefined`, mas o componente `VeiculosEsperadosPanel` testa `!readOnly` para mostrar o botão. Como `readOnly={false}` é hardcoded (linha 356), o botão "Limpar lista" aparece mas `onClear` é `undefined`, causando crash ao clicar.

**Correção:** O `VeiculosEsperadosPanel` deveria verificar `onClear` ao invés de `readOnly` para renderizar o botão, ou `readOnly` deveria ser `isPortaria`.

### 2.5 MÉDIO: `Index.tsx` — `handleUndoCargaConfirm` usa supabase direto
A função `handleUndoCargaConfirm` (linha 204) faz update direto ao supabase sem usar o mutation hook. Isso bypassa o optimistic update e pode causar inconsistência no cache do React Query.

### 2.6 MÉDIO: Filtro tipo/categoria com valor vazio vs "all"
Em `Portaria.tsx`, `categoriaFilter` inicia como `"all"` mas `clearFilters` (linha 62) seta para `""`. A tabela recebe `categoriaFilter === "all" ? "" : categoriaFilter`. Internamente funciona mas a lógica é confusa e pode quebrar em futuras alterações.

### 2.7 BAIXO: `useCarregamentos` realtime channel não filtra por data
O channel escuta TODOS os eventos da tabela `carregamentos_dia` independente do range de data. Quando há muitos registros em outras datas, o realtime pode invalidar queries desnecessariamente.

### 2.8 BAIXO: Importação de clientes sem controle de role
`Clientes.tsx` (linha 75) permite a importação de planilha por qualquer usuario com acesso à pagina. Não há verificação de role no frontend (mas RLS protege parcialmente).

---

## PARTE 3 — Edge Functions e Backend

### 3.1 ALTO: `roteirizar` edge function sem autenticação
A função `roteirizar` aceita qualquer requisição (config: `verify_jwt = false`) e não valida o JWT no código. Qualquer pessoa pode chamar a API e consumir créditos do ORS/Nominatim.

### 3.2 ALTO: `roteirizar` sem validação de input
O body não é validado — campos como `destinos` e `origemCidade` não são verificados. Valores malformados podem causar erros não tratados ou chamadas invalidas ao ORS.

### 3.3 MÉDIO: `create-user` — upsert com race condition
Linhas 94-104: Se o trigger `handle_new_user` ainda não executou quando o `upsert` roda, e depois o trigger cria o role default "logistica", ficam dois roles para o mesmo usuario.

### 3.4 BAIXO: `roteirizar` usa `SUPABASE_SERVICE_ROLE_KEY` para cache
A função usa service role para acessar o `geocode_cache`. Isso bypassa RLS, o que é ok para cache, mas expõe o service role key em um contexto desnecessário.

---

## PARTE 4 — Performance e UX

### 4.1 MÉDIO: `Consolidado.tsx` — realtime channel recria em cada mudança de data
O `useEffect` (linha 67) cria um novo channel cada vez que `dateFrom/dateEnd` muda. Para seleções rápidas de data (tipo scrolling), isso pode criar/destruir channels excessivamente.

### 4.2 MÉDIO: PatioAtualTab timer roda a cada 60s globalmente
O `setInterval` (linha 78) atualiza `now` a cada minuto, causando re-render de toda a lista do patio. Para listas grandes, pode causar jank.

### 4.3 BAIXO: Todos os hooks de dados fazem queries mesmo quando a pagina não precisa
As paginas de cadastro (Produtos, Vendedores, etc.) sempre carregam todos os registros ao montar. Não há lazy loading ou virtualização para tabelas grandes.

### 4.4 BAIXO: `FechamentoLoteDialog` e `RoteirizacaoDialog` carregam `RotaMap` com lazy
O retry no `.catch()` apenas tenta carregar o mesmo módulo novamente — se o problema for persistente (ex: cache corrompido), o retry falha igualmente.

---

## PARTE 5 — Integridade de Dados e Consistência

### 5.1 ALTO: Sem constraint `unique` em `codigo_produto` e `codigo_vendedor`
As tabelas `produtos` e `vendedores` não possuem constraint unique nos campos de código. É possivel criar duplicatas com o mesmo código.

**Correção:** Adicionar `UNIQUE` constraint em `codigo_produto` (tabela produtos) e `codigo_vendedor` (tabela vendedores).

### 5.2 ALTO: `carregamentos_dia.status` check constraint pode bloquear rupturas
Os status de ruptura (`Aguardando pedido`, `Romaneio Liberado`, etc.) precisam estar incluidos na constraint de status no banco. Se não estiverem, inserções/updates com status de ruptura falham silenciosamente.

### 5.3 MÉDIO: `clientes` upsert usa `onConflict: "codigo_cliente"` mas pode não ter unique index
A importação de clientes (linha 94) usa upsert com `onConflict: "codigo_cliente"`, mas se não houver unique index nessa coluna, o upsert não funciona como esperado.

### 5.4 MÉDIO: Foreign key missing em `carregamentos_dia.vendedor_id`
A coluna `vendedor_id` referencia vendedores mas não tem FK declarada. Vendedores podem ser excluidos deixando registros orfãos.

### 5.5 BAIXO: `profiles` não pode receber INSERT
A tabela `profiles` não tem policy de INSERT para users autenticados. O INSERT é feito pelo trigger `handle_new_user` com SECURITY DEFINER. Se o trigger falhar, o perfil não é criado e o usuario fica sem acesso.

---

## Plano de Implementação (priorizado)

### Fase 1 — Crítico (segurança)
1. Adicionar autenticação JWT em `roteirizar` e `ocr-portaria`
2. Restringir RLS de INSERT/UPDATE em tabelas de cadastro por role
3. Corrigir DELETE policy em `veiculos_esperados` (restringir a admin+logistica)

### Fase 2 — Alto (bugs funcionais)
4. Paginação em `useProdutos` e `useVendedores` (padrão do `useClientes`)
5. Corrigir bug do botão "Limpar lista" para portaria (crash quando `onClear` é undefined)
6. Adicionar unique constraints em `codigo_produto` e `codigo_vendedor`
7. Validar input nas edge functions

### Fase 3 — Médio (qualidade)
8. Corrigir console warnings de ref no Consolidado
9. Corrigir colSpan das linhas expandidas no Consolidado
10. Melhorar lógica de filtros na Portaria (padronizar "all" vs "")

### Fase 4 — Baixo (melhorias)
11. Otimizar realtime channels com filtro por data
12. Lazy loading para tabelas grandes
13. Input validation nos formulários de cadastro

| Fase | Arquivos | Tipo |
|------|----------|------|
| 1 | `roteirizar/index.ts`, `ocr-portaria/index.ts`, migrations (RLS) | Backend + DB |
| 2 | `useProdutos.ts`, `useVendedores.ts`, `Portaria.tsx`, migrations | Frontend + DB |
| 3 | `Consolidado.tsx`, `Portaria.tsx` | Frontend |
| 4 | Hooks diversos, componentes | Frontend |

