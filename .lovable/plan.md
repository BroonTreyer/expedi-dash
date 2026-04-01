

# Auditoria de Bugs e Problemas no Sistema

Após revisar todo o código das páginas, hooks, e componentes que interagem entre si, identifiquei os seguintes problemas:

---

## Bugs Encontrados

### 1. Console Warning: "Function components cannot be given refs" (Relatorios/Layout)
**Onde:** `Relatorios.tsx` e `Layout.tsx`
**Problema:** O React Router tenta passar uma `ref` para os componentes de página. `Relatorios` e `Layout` são function components sem `forwardRef`, gerando o warning no console. Não causa crash mas polui logs.
**Correção:** Não é crítico — é apenas um warning do React 18 com react-router-dom. Pode ser ignorado ou resolvido envolvendo `Layout` com `forwardRef`.

### 2. Caminhões: Dialog não reseta estado ao reabrir para "Novo"
**Onde:** `Caminhoes.tsx` → `CaminhaoFormDialog`
**Problema:** O `useState` inicial usa `caminhao?.placa ?? ""` etc., mas como o componente usa `key={editing?.id ?? "new"}`, ao clicar "Novo" duas vezes seguidas (sem editar entre elas) o React reutiliza a mesma instância e os campos mantêm valores antigos do último "Novo" preenchido.
**Correção:** Adicionar `useEffect` para resetar campos quando `open` muda para `true`, similar ao que `FechamentoLoteDialog` já faz.

### 3. Caminhões: Exclusão sem confirmação
**Onde:** `Caminhoes.tsx`, linhas 164 e 207
**Problema:** O botão de excluir caminhão chama `deleteMut.mutate(c.id)` diretamente sem dialog de confirmação. Um clique acidental exclui o registro permanentemente.
**Correção:** Adicionar `DeleteConfirmDialog` como já existe em outras páginas.

### 4. CaminhaoAutocomplete: busca dispara com 2 chars mas lista pode ser enorme
**Onde:** `CaminhaoAutocomplete.tsx`
**Problema:** A busca no banco usa `ilike` com apenas 2 caracteres, podendo retornar muitos resultados. O componente limita a 8 na UI mas a query ao banco não tem `limit`.
**Correção:** Adicionar `.limit(10)` na query do `useCaminhoes`.

### 5. PlacaInput: referências instáveis no `useEffect` causam loops potenciais
**Onde:** `PlacaInput.tsx`
**Problema:** O `onAutofill` callback é passado como prop e usado como dependência implícita nos `useEffect`. Se o pai recria a função a cada render (sem `useCallback`), os efeitos de autofill podem disparar repetidamente.
**Correção:** Usar `useRef` para `onAutofill` ou garantir que o pai use `useCallback`.

### 6. Consolidado: query "today" traz pendentes sem limite de tempo
**Onde:** `Consolidado.tsx`, linha 52
**Problema:** A query `or(data.eq.${dateFrom},and(data.lt.${dateFrom},status.neq.Carregado))` traz **todos** os itens pendentes de **todas** as datas anteriores (sem limite). Se o sistema acumular dados ao longo de meses, isso pode trazer centenas de registros antigos.
**Correção:** Adicionar filtro de limite (ex: últimos 30 dias) como já existe em `useCarregamentos.ts`.

### 7. Analytics: query sem limite de 1000 rows
**Onde:** `useAnalytics.ts`
**Problema:** As queries de `carregamentos_dia` para períodos longos (90 dias) podem ultrapassar o limite padrão de 1000 rows do Supabase, resultando em dados incompletos sem nenhum aviso ao usuário.
**Correção:** Adicionar `.limit(5000)` ou paginação, ou alertar quando os dados atingirem 1000 rows.

### 8. Relatórios: presets calculados no topo do módulo (stale dates)
**Onde:** `Relatorios.tsx`, linhas 18-25
**Problema:** `const today = new Date()` e `presets` são calculados **uma vez** quando o módulo é carregado. Se o usuário deixar a aba aberta por dias, os presets ficam desatualizados.
**Correção:** Mover para dentro do componente ou usar `useMemo`.

### 9. useCarregamentos: realtime não filtra por data
**Onde:** `useCarregamentos.ts`, linhas 47-90
**Problema:** O canal realtime escuta **todas** as mudanças na tabela `carregamentos_dia`, independente da data filtrada. Updates de outros dias são aplicados ao cache local, podendo inserir itens de datas diferentes no array visible.
**Correção:** A invalidação via INSERT já é segura (re-fetcha tudo), mas o handler de UPDATE aplica patches cegamente. O merge em `setQueriesData` deveria verificar se o item pertence ao range filtrado.

### 10. Veículos Esperados: `useVeiculosEsperados` usa `as any` extensivamente
**Onde:** `useVeiculosEsperados.ts`
**Problema:** Múltiplos casts `as any` indicam que a tabela `veiculos_esperados` pode não estar refletida nos types gerados. Qualquer mudança de schema pode causar erros silenciosos.
**Correção:** Regenerar os types do Supabase para incluir a tabela.

---

## Priorização

| Prioridade | Bug | Impacto |
|---|---|---|
| Alta | #7 Analytics 1000-row limit | Dados incompletos sem aviso |
| Alta | #6 Consolidado pendentes sem limite | Performance degradada |
| Média | #3 Exclusão sem confirmação | Perda de dados acidental |
| Média | #2 Dialog não reseta | UX confusa |
| Média | #9 Realtime sem filtro de data | Dados de datas erradas no cache |
| Baixa | #8 Presets stale | Datas erradas após horas |
| Baixa | #4 Query sem limit | Performance |
| Baixa | #1, #5, #10 | Warnings/manutenção |

---

## Arquivos a Alterar

| Arquivo | Correções |
|---|---|
| `src/hooks/useAnalytics.ts` | Adicionar `.limit(5000)` nas queries |
| `src/pages/Consolidado.tsx` | Adicionar limite de 30 dias nos pendentes |
| `src/pages/Caminhoes.tsx` | Dialog reset + confirmação de exclusão |
| `src/hooks/useCaminhoes.ts` | Adicionar `.limit(10)` na query de busca |
| `src/pages/Relatorios.tsx` | Mover `today`/`presets` para dentro do componente |
| `src/hooks/useCarregamentos.ts` | Filtrar updates realtime por data range |
| `src/components/portaria/PlacaInput.tsx` | Estabilizar ref do onAutofill |

