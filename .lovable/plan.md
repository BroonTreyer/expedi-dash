

## Transferir movimentação entre categorias (Carga Própria ↔ Terceirizado)

### Problema
Hoje, para mudar a categoria de um veículo no pátio, o usuário precisa abrir o diálogo de edição e alterar manualmente o campo "Categoria". Porém, ao trocar de `carga_propria` para `terceirizado`, os campos de etapa ficam inconsistentes: `etapa_carga_propria` continua preenchido e `etapa_terceirizado` fica vazio, causando comportamento errado no fluxo de saída.

### Solução
Adicionar um botão **"Transferir p/ Terceirizado"** (ou "Transferir p/ Carga Própria", dependendo da categoria atual) na tabela de Pátio Atual, com confirmação rápida. A transferência atualiza `categoria` e converte automaticamente o campo de etapa.

### Mudanças

**1. `src/hooks/useMovimentacoesPortaria.ts`** — nova mutação `useTransferirCategoria`
- Recebe `{ id, novaCategoria }`.
- Atualiza: `categoria`, limpa o campo de etapa antigo, preenche o novo:
  - `carga_propria → terceirizado`: `etapa_carga_propria = null`, `etapa_terceirizado = 'no_patio'`.
  - `terceirizado → carga_propria`: `etapa_terceirizado = null`, `etapa_carga_propria = 'chegou'`.
- Invalida queries de movimentações.

**2. `src/components/portaria/PatioAtualTab.tsx`** — botão de transferência
- Na coluna "Ações" de cada veículo no pátio (desktop: novo botão ao lado de "Saída"; mobile: no card), adicionar um ícone/botão "Transferir" (`ArrowRightLeft` do lucide).
- Ao clicar: confirm dialog simples — "Transferir placa XXX de Carga Própria para Terceirizado?" → chama `transferirCategoria.mutate(...)`.
- O botão mostra a categoria destino (oposta à atual). Só aparece para `carga_propria` e `terceirizado`.

**3. `src/components/portaria/EditMovimentoDialog.tsx`** — swap automático de etapas
- Quando o usuário altera "Categoria" no select, limpar automaticamente o campo de etapa antigo e preencher o novo com o valor padrão (`chegou` / `no_patio`). Isso evita inconsistências mesmo pelo caminho de edição manual.

### Arquivos
- ✏️ `src/hooks/useMovimentacoesPortaria.ts` — `useTransferirCategoria` mutation
- ✏️ `src/components/portaria/PatioAtualTab.tsx` — botão "Transferir" na coluna de ações
- ✏️ `src/components/portaria/EditMovimentoDialog.tsx` — swap automático de etapas ao mudar categoria

