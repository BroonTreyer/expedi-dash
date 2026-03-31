

# Adicionar Coluna "Data Cadastro" na Tabela de Expedição

## Problema

A tabela do painel de expedição não exibe a data em que os pedidos foram inseridos (`created_at`). Quando se visualiza vários dias ou pedidos pendentes de dias anteriores, não há como saber quando cada pedido foi cadastrado.

## Solução

**`src/components/dashboard/CarregamentoTable.tsx`**:

1. Adicionar coluna **"Dt. Cadastro"** após a coluna "Frete", exibindo `created_at` formatado como `dd/MM` (dia/mês, compacto)
2. Adicionar coluna **"Dt. Pedido"** logo após, exibindo o campo `data` formatado como `dd/MM`
3. Adicionar sort accessors para ambas (`created_at` e `data`)
4. Atualizar `colCount` (+2)
5. Adicionar as mesmas informações no `MobileCardItem` (seção de detalhes)
6. Renderizar nas linhas de grupo expandido também

As datas serão exibidas no formato compacto `dd/MM` para não ocupar espaço excessivo na tabela.

| Arquivo | Mudança |
|---|---|
| `src/components/dashboard/CarregamentoTable.tsx` | Adicionar colunas "Dt. Cadastro" (created_at) e "Dt. Pedido" (data) na tabela desktop e mobile |

