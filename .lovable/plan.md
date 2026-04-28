# Corrigir badge de Ruptura ausente em algumas linhas

## Problema

Em alguns pedidos com ruptura, o badge "Ruptura" (laranja) não aparece em todas as linhas. Isso acontece porque há **dois tipos** de ruptura no banco:

- `ruptura = true` → ruptura **total** (item zerado, marcado manualmente).
- `ruptura_sinalizada = true` → ruptura **parcial** (peso atual menor que o `peso_original`, marcada automaticamente pelo trigger `preserve_peso_original`).

Hoje, em vários componentes do painel principal, o badge só é exibido quando `c.ruptura === true`, ignorando os casos de ruptura parcial. Já em `RupturasVendedor.tsx` o filtro usa `c.ruptura || c.ruptura_sinalizada` — por isso lá aparece corretamente, mas no Dashboard/Tabela/Kanban não.

## Solução

Unificar a regra: tratar como "tem ruptura" sempre que `c.ruptura || c.ruptura_sinalizada` for verdadeiro. Aplicar em todos os pontos onde o badge/realce aparece.

### Arquivos a alterar

1. **`src/components/dashboard/CarregamentoTable.tsx`**
   - Linha ~227 (card mobile): badge "Ruptura".
   - Linha ~509 e ~790: classe de fundo amarelo da `TableRow`.
   - Linha ~521: ícone `AlertTriangle` na coluna Etapa.
   - Linha ~537 e ~806: badge "Ruptura" na coluna do código do produto.
   - Linha ~634: cálculo de `hasRuptura` no grupo multi-item (header).
   - Trocar todas essas checagens de `c.ruptura` para `(c.ruptura || c.ruptura_sinalizada)`. Criar um helper local `hasRup(c)` para evitar repetição.

2. **`src/components/dashboard/KanbanView.tsx`**
   - Linha ~46 e ~52: borda esquerda âmbar e ícone `AlertTriangle` no card.
   - Mesma troca para `(c.ruptura || c.ruptura_sinalizada)`.

3. **(Opcional, para consistência futura)** Adicionar helper compartilhado em `src/lib/peso-utils.ts` (ou novo `src/lib/ruptura-utils.ts`):
   ```ts
   export const temRuptura = (c: { ruptura?: boolean | null; ruptura_sinalizada?: boolean | null }) =>
     !!(c.ruptura || c.ruptura_sinalizada);
   ```
   E usar em todos os componentes acima + `RupturasVendedor.tsx`.

## O que NÃO muda

- O badge específico "Parcial" (`ParcialBadge`) continua igual — ele já trata o caso parcial separadamente quando aplicável.
- A lógica de salvar/marcar ruptura no `CarregamentoDialog` permanece inalterada.
- Nenhuma mudança de banco de dados; apenas frontend.

## Resultado esperado

Toda linha de pedido (no Dashboard, na tabela expandida e no Kanban) que tenha ruptura total **ou** parcial mostrará o badge laranja "Ruptura" e o realce de fundo, igual ao comportamento já presente na lista "Minhas Rupturas" do vendedor.