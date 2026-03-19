

## Plano: Toggle "Logística OK" no Painel + Pré-visualização de Carga

### 1. Toggle para mostrar/esconder "Logística OK" no Painel

**`src/pages/Index.tsx`**:
- Adicionar estado `showLogistica` (boolean, default `false`)
- Adicionar botão toggle ao lado do "Ver Finalizados" (ex: "Ver Logística OK" com ícone e badge de contagem)
- No `filtered`, mudar a lógica: em vez de `if (c.etapa === "logistica") return false`, usar `if (c.etapa === "logistica" && !showLogistica) return false`
- Os itens logística OK aparecerão na tabela/kanban quando o toggle estiver ativo

### 2. Pré-visualização da Carga com Checkboxes (antes de fechar)

**`src/components/dashboard/FechamentoLoteDialog.tsx`**:
- Adicionar estado `excludedIds: Set<string>` para controlar quais itens estão desmarcados
- Cada item individual dentro de um grupo de cliente ganha um checkbox
- Itens desmarcados ficam visualmente esmaecidos e não entram no `handleSubmit`
- Recalcular `totalPeso` e `totalPedidos` considerando apenas itens marcados
- Se todos os itens de um grupo forem desmarcados, o grupo inteiro fica esmaecido
- Adicionar checkbox de grupo (seleciona/deseleciona todos os itens do cliente)
- O botão "Fechar Carga" mostra apenas a contagem dos itens marcados

### Arquivos alterados
- `src/pages/Index.tsx` — toggle showLogistica + botão
- `src/components/dashboard/FechamentoLoteDialog.tsx` — checkboxes por item e por grupo

### Sem alterações no banco de dados

