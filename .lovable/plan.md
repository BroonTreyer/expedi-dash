

# Cadastrar Produtos Fricó no Banco de Dados

O usuário enviou a lista completa de produtos Fricó. Vou inserir todos via migração SQL na tabela `produtos`.

## Dados
- ~100 produtos com código, nome, peso padrão (extraído da embalagem) e todos ativos
- A tabela `produtos` tem: `codigo_produto` (text), `nome_produto` (text), `peso_padrao` (numeric), `ativo` (boolean)

## Plano

### 1. Migração SQL
- Limpar produtos existentes (se houver dados de teste)
- INSERT de todos os ~100 produtos com:
  - `codigo_produto`: código numérico como texto (ex: "301")
  - `nome_produto`: nome completo do produto
  - `peso_padrao`: peso unitário em kg (ex: "4 x 5kg" → 20kg total por caixa)
  - `ativo`: true para todos

### 2. Peso Padrão
Vou calcular o peso total da caixa/embalagem (quantidade × peso unitário). Ex:
- "4 x 5kg" → 20
- "12 x 800g" → 9.6
- "10 x 500g" → 5
- "25kg" → 25

Isso representará o peso padrão por volume/caixa do produto.

