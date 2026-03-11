

# Auditoria Completa do Sistema

## Bugs e Erros Encontrados

### 1. Erro de Console: Ref em Select (Warning React)
**Arquivo:** `CarregamentoDialog.tsx`
O console mostra "Function components cannot be given refs" no componente `Select`. Isso ocorre porque o `Select` do Radix está recebendo um ref indevidamente. Não é um bug crítico, mas gera warnings.

### 2. `App.css` com estilos órfãos conflitantes
**Arquivo:** `src/App.css`
Contém estilos de template padrão do Vite (`#root { max-width: 1280px; margin: 0 auto; padding: 2rem; text-align: center; }`). Isso pode limitar a largura do app e adicionar padding/centralização indesejada. Deve ser removido ou limpo.

### 3. KanbanView ainda referencia `cidade` removido
**Arquivo:** `KanbanView.tsx`, linha 45
Ainda exibe `{c.cidade && <div>{c.cidade}/{c.uf}</div>}` -- deveria mostrar apenas `{c.uf}` já que "Cidade" foi removida da interface.

### 4. Diálogos de Produtos/Vendedores sem `DialogDescription`
**Arquivos:** `Produtos.tsx`, `Vendedores.tsx`, `TiposCaminhao.tsx`
Falta `DialogDescription` nos diálogos, gerando warning de acessibilidade do Radix.

### 5. Tabela colSpan desatualizado
**Arquivo:** `CarregamentoTable.tsx`, linha 62
O `colSpan={16}` na mensagem "Nenhum carregamento encontrado" pode estar incorreto após remoção da coluna Cidade. Deve ser 15.

### 6. Filtro `cidade` removido do tipo mas não do state
**Arquivo:** `Index.tsx`
O state `filters` não tem mais `cidade`, mas a remoção pode ter deixado resíduos. Preciso confirmar que está limpo.

### 7. Sem confirmação antes de deletar
**Todos os CRUDs** (Produtos, Vendedores, Tipos, Carregamentos) executam delete imediatamente sem dialog de confirmação. Risco de exclusão acidental.

### 8. Sem loading/empty states consistentes
Páginas de Produtos, Vendedores e TiposCaminhao não mostram estado de loading nem mensagem quando a lista está vazia.

### 9. Tabela principal com scroll horizontal excessivo
A tabela tem muitas colunas, gerando scroll horizontal. Algumas colunas poderiam ser compactadas ou ocultadas em telas menores.

---

## Problemas de Layout/Visual

### 10. "Lovable App" texto visível no topo
O `index.html` provavelmente mostra texto padrão "Lovable App" antes do React carregar, visível no screenshot no canto superior esquerdo.

### 11. Sidebar sem responsividade mobile
A sidebar é fixa com `w-60` e `min-h-screen`. Em mobile não há hamburger menu, a sidebar ocupa espaço e esmaga o conteúdo.

### 12. Filtros sem responsividade
Os filtros usam `flex-wrap` mas podem ficar apertados em telas menores.

---

## Plano de Correções

### Prioridade Alta (bugs funcionais)
1. **Limpar `App.css`** -- remover estilos órfãos do template Vite que podem causar layout issues
2. **Corrigir KanbanView** -- remover referência a `cidade`, exibir apenas UF
3. **Corrigir `colSpan`** na tabela (16 → 15)

### Prioridade Média (warnings/UX)
4. **Adicionar `DialogDescription`** nos diálogos de Produtos, Vendedores, TiposCaminhao
5. **Adicionar confirmação de exclusão** com AlertDialog em todos os botões de delete
6. **Adicionar empty state** nas tabelas de Produtos, Vendedores e TiposCaminhao

### Prioridade Baixa (melhorias visuais)
7. **Corrigir título da página** no `index.html` (trocar "Lovable App" por "Expedição - Painel Logístico")
8. **Adicionar menu hamburguer** para mobile na sidebar

### Arquivos afetados
- `src/App.css` -- limpar estilos órfãos
- `src/components/dashboard/KanbanView.tsx` -- remover cidade
- `src/components/dashboard/CarregamentoTable.tsx` -- corrigir colSpan
- `src/pages/Produtos.tsx` -- DialogDescription + empty state + confirmação delete
- `src/pages/Vendedores.tsx` -- DialogDescription + empty state + confirmação delete
- `src/pages/TiposCaminhao.tsx` -- DialogDescription + empty state + confirmação delete
- `index.html` -- corrigir título

