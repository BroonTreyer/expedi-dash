

# Ações de Admin + Visualização de Fotos

## Entendimento do Fluxo
O fluxo já está correto: **Entrada** = caminhão chega (KM inicial) → carrega → sai → **Saída** = caminhão volta (KM final). Nenhuma mudança necessária aqui.

## Sobre as Fotos
As fotos são salvas no bucket de armazenamento `portaria` (público). As URLs são gravadas nos campos `foto_placa_url`, `foto_painel_url`, `foto_documento_url` e `foto_nota_url`. O `MovimentoDetailsDialog` já exibe as fotos, mas em tamanho pequeno (h-32). Vou adicionar **clique para ampliar** em tela cheia.

## Mudanças

### 1. `useMovimentacoesPortaria.ts` — Hooks de delete e update
- `useDeleteMovimentacao`: deleta um registro por ID
- `useUpdateMovimentacao`: atualiza campos de um registro

### 2. `MovimentoDetailsDialog.tsx` — Botões admin + zoom nas fotos
- Adicionar botões **Editar** e **Excluir** visíveis apenas para `role === "admin"`
- Clique em foto abre modal fullscreen para visualização ampliada
- Confirmação antes de excluir

### 3. `HistoricoTab.tsx` — Botão de excluir na tabela (admin)
- Adicionar ícone de lixeira na coluna de ações para admins

### 4. Novo: `EditMovimentoDialog.tsx`
- Dialog de edição com os mesmos campos do registro original, pré-preenchidos
- Usa `useUpdateMovimentacao` para salvar

## Arquivos

| Arquivo | Mudança |
|---------|---------|
| `src/hooks/useMovimentacoesPortaria.ts` | Adicionar `useDeleteMovimentacao` e `useUpdateMovimentacao` |
| `src/components/portaria/MovimentoDetailsDialog.tsx` | Botões admin (editar/excluir), zoom em fotos, confirmação de exclusão |
| `src/components/portaria/EditMovimentoDialog.tsx` | Novo dialog de edição |
| `src/components/portaria/HistoricoTab.tsx` | Botão excluir para admin |

