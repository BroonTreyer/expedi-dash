

# Substituir colunas Início/Fim por coluna CIF/FOB

## Problema
As colunas "Início" e "Fim" (horário de início e fim de carregamento) ocupam espaço na tabela. O usuário quer removê-las e adicionar uma coluna "CIF/FOB" que será preenchida no cadastro do pedido.

## Alterações

### 1. Migração de banco de dados
Adicionar coluna `tipo_frete` (text, nullable, default null) na tabela `carregamentos_dia` para armazenar "CIF" ou "FOB".

```sql
ALTER TABLE public.carregamentos_dia ADD COLUMN tipo_frete text DEFAULT null;
```

### 2. `src/components/dashboard/CarregamentoTable.tsx`
- Remover as colunas `<TableHead>Início</TableHead>` e `<TableHead>Fim</TableHead>` e suas respectivas `<TableCell>` (que exibem `horario_inicio` e `horario_fim`)
- Adicionar coluna `<TableHead>Frete</TableHead>` que exibe o valor de `tipo_frete` ("CIF" ou "FOB")
- Aplicar mesma mudança na versão mobile
- Ajustar `colCount`

### 3. `src/components/dashboard/CarregamentoDialog.tsx`
- No bloco de campos de vendas (`showVendas`), adicionar um `Select` com opções "CIF" e "FOB" para o campo `tipo_frete`
- Posicionar na primeira linha junto com Data, N° Pedido, Cidade, UF (tornando grid de 5 colunas ou adicionando em nova linha)

### 4. `src/hooks/useCarregamentos.ts`
- Adicionar `tipo_frete` ao tipo `Carregamento`

## Arquivos editados
- Migração SQL (nova coluna)
- `src/hooks/useCarregamentos.ts`
- `src/components/dashboard/CarregamentoTable.tsx`
- `src/components/dashboard/CarregamentoDialog.tsx`

