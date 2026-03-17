

# Remover coluna "Carga" da impressão do Consolidado

## Alteração

**Arquivo:** `src/components/dashboard/ConsolidadoPrintDialog.tsx`

Remover a coluna "Carga" (que exibe o `cargaId`) da tabela de impressão:
- Remover o `<th>` "Carga" do cabeçalho (linha 108)
- Remover o `<td>` com `g.cargaId` do corpo (linha 123)

A informação continua disponível internamente no sistema, apenas não será impressa.

### Arquivo editado
- `src/components/dashboard/ConsolidadoPrintDialog.tsx` — remover coluna Carga da tabela

