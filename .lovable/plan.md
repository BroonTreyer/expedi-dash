

# Busca por Código de Vendedor + Peso Automático

## Alterações em `src/components/dashboard/CarregamentoDialog.tsx`

### 1. Campo de código do vendedor
- Adicionar um campo `Input` ao lado do select de vendedor onde o usuário digita o `codigo_vendedor`
- Ao digitar, buscar na lista de vendedores pelo código e selecionar automaticamente o vendedor correspondente (seta `vendedor_id`)
- Layout: código do vendedor (campo pequeno) + select do vendedor na mesma linha

### 2. Peso automático ao selecionar produto
- O `handleCodigoProduto` já preenche o peso, mas só quando `form.peso === 0`. Vou ajustar para **sempre** preencher o peso com o `peso_padrao` do produto ao digitar o código, sobrescrevendo o valor atual (o usuário pode editar depois se quiser).

### Resultado
- Vendedor: digita "114" → seleciona automaticamente "JOSUE MARCELO"
- Produto: digita "301" → preenche nome e peso automaticamente

