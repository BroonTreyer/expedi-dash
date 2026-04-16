

## Plano: Edição de cargas fechadas no Consolidado

### O que será feito

Criar um diálogo de edição de carga que abre ao clicar em um botão "Editar" na linha da carga (desktop) ou no card (mobile). O diálogo permitirá:

1. **Editar nome da carga** — campo de texto editável
2. **Editar placa, motorista, tipo caminhão, transportadora** — campos editáveis da carga
3. **Ver e remover pedidos** — lista dos pedidos dentro da carga com botão de remover (desvincula o pedido da carga, limpando `carga_id` e `nome_carga`)

### Componente novo

**`src/components/dashboard/EditarCargaDialog.tsx`**

- Recebe a `CargaGroup` com todos os items
- Formulário com campos: Nome da Carga, Placa, Motorista, Tipo Caminhão, Transportadora
- Lista de pedidos com botão "X" para remover cada um
- Ao salvar: batch update de todos os items da carga com os novos valores dos campos compartilhados
- Ao remover pedido: update individual limpando `carga_id`, `nome_carga`, `etapa` volta para "vendas"

### Alterações em `src/pages/Consolidado.tsx`

- Adicionar state para controlar qual carga está sendo editada
- Botão "Editar" (ícone lápis) na linha da tabela e no card mobile
- Importar e renderizar o `EditarCargaDialog`
- Mutations para:
  - Update batch dos campos da carga (nome_carga, placa, motorista, tipo_caminhao, transportadora)
  - Desvincular pedido (limpar carga_id/nome_carga e voltar etapa para "vendas")

### Arquivos

| Arquivo | Ação |
|---------|------|
| `src/components/dashboard/EditarCargaDialog.tsx` | Criar |
| `src/pages/Consolidado.tsx` | Alterar — botão editar + state + dialog |

### Comportamento

- Campos compartilhados (placa, motorista, etc.) são salvos em batch para todos os pedidos da carga
- Remover pedido desvincula da carga e retorna à etapa "vendas"
- Confirmação antes de remover pedido
- Invalidação do cache após salvar/remover
- Toast de sucesso/erro

