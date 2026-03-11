

# Remover Cidade + Permitir múltiplos produtos por pedido

## 1. Remover campo Cidade

**Arquivos afetados:**
- `CarregamentoDialog.tsx`: remover o campo "Cidade" do formulário (linhas 143-146) e do resumo logística (linha 212)
- `CarregamentoTable.tsx`: remover coluna "Cidade" do header e body (linhas 49, 80), ajustar colSpan
- `Filters.tsx`: remover o input de filtro "Cidade" (linhas 79-85) e a prop `cidade` do tipo de filtros

O campo `cidade` permanece na tabela do banco (não quebra nada), apenas deixa de ser exibido/editado.

## 2. Múltiplos produtos por pedido

Permitir adicionar vários itens (código produto + quantidade) em um único pedido. Abordagem:

- No dialog de vendas, ao invés de um único produto, ter uma **lista de itens** com botão "+ Adicionar Produto"
- Cada item tem: código produto, nome (auto), quantidade, peso (auto-calculado)
- Ao submeter, cada item vira um registro separado em `carregamentos_dia` (mesmo vendedor, data, UF, etc.) — mantém a estrutura atual do banco sem precisar criar tabela de itens

**Alterações em `CarregamentoDialog.tsx`:**
- Criar state `items: Array<{ codigo_produto, nome_produto, quantidade, peso, pesoPadrao }>` inicializado com 1 item
- Renderizar lista de itens com campos inline (código, nome readonly, qtd, peso)
- Botão "+ Adicionar Produto" para inserir novo item vazio
- Botão de remover item (X) quando houver mais de 1
- No submit: chamar `onSubmit` para cada item, mesclando os dados comuns (vendedor, data, UF, obs)

**Alterações no componente pai (Index.tsx):**
- Ajustar `onSubmit` para aceitar array de payloads ou ser chamado múltiplas vezes

