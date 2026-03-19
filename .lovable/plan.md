

## Plano: Reordenação de Destinos com 3 Métodos + Persistência de Seleção

### Problema
1. As setas para reordenar são lentas para muitos destinos
2. Não há como digitar diretamente o número da ordem
3. Não há drag-and-drop para arrastar blocos
4. Ao fechar o dialog de "Fechar Carga", as desmarcações feitas dentro dele são perdidas

### Solução

#### 1. Input numérico editável para ordem de entrega
Substituir o círculo fixo com número por um `<Input>` numérico pequeno (w-10). Ao digitar um número e sair do campo (onBlur), o grupo é reposicionado para aquela posição e todos os demais são renumerados automaticamente.

#### 2. Drag-and-drop com @dnd-kit
Instalar `@dnd-kit/core` e `@dnd-kit/sortable` + `@dnd-kit/utilities`. Envolver a lista de destinos em `<SortableContext>` e cada card em um `useSortable`. Adicionar um ícone de "grip" (⠿) à esquerda de cada card como handle de arrasto.

#### 3. Manter setas como opção complementar
As setas Up/Down continuam funcionando como estão.

#### 4. Persistir desmarcações ao fechar o dialog
Atualmente o `FechamentoLoteDialog` recebe `items` (filtrado por `selectedIds` no Index) e ao abrir reconstrói os grupos resetando `excludedGroupKeys`.

**Mudança**: Quando o usuário desmarca um grupo no dialog e fecha, propagar as exclusões de volta ao `Index.tsx` removendo os IDs correspondentes do `selectedIds`. Adicionar callback `onExclude` no dialog que, ao fechar, chama `onSelectionChange` com os IDs atualizados (sem os excluídos).

### Arquivos alterados

- **`package.json`** — adicionar `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`
- **`src/components/dashboard/FechamentoLoteDialog.tsx`** — refatoração completa:
  - Integrar `@dnd-kit` sortable na lista de grupos
  - Substituir círculo de ordem por input numérico editável
  - Adicionar grip handle para drag
  - Adicionar prop `onExclude` para propagar desmarcações ao fechar
- **`src/pages/Index.tsx`** — passar callback `onExclude` ao `FechamentoLoteDialog` que atualiza `selectedIds`

### Sem alterações no banco de dados

