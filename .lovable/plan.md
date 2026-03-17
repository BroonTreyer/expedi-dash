

# Adicionar pedido a uma carga já fechada

## Contexto
Hoje, para incluir um pedido esquecido em uma carga já fechada, é preciso desfazer a carga inteira e refazê-la. O usuário quer um atalho para vincular pedidos pendentes diretamente a uma carga existente.

## Solução
Criar um diálogo "Adicionar à Carga" que permite selecionar uma carga existente (pelo carga_id) e vincular os pedidos selecionados a ela, copiando os metadados de transporte (placa, motorista, tipo_caminhao, etc.).

### Fluxo do usuário
1. Seleciona pedidos pendentes na tabela (checkboxes existentes)
2. Clica em novo botão **"Adicionar à Carga"** (ao lado de "Fechar Carga" na barra de seleção)
3. Abre diálogo mostrando lista das cargas já fechadas do dia com resumo (placa, motorista, peso)
4. Seleciona a carga destino
5. Define a ordem de entrega dos novos itens
6. Confirma — os pedidos recebem o `carga_id`, `placa`, `motorista`, `tipo_caminhao`, `etapa: "logistica"` da carga escolhida

### Arquivos a criar
- `src/components/dashboard/AdicionarCargaDialog.tsx` — novo diálogo com:
  - Lista de cargas existentes (agrupadas por `carga_id` dos itens do dia que já têm carga)
  - Exibe placa, motorista, tipo, peso total por carga
  - Campo de ordem de entrega para os novos itens
  - Botão confirmar

### Arquivos a editar
- `src/pages/Index.tsx`:
  - Computar lista de cargas fechadas do dia (`carregamentos` onde `carga_id != null`, agrupados)
  - Adicionar botão "Adicionar à Carga" na barra de seleção (ao lado de "Fechar Carga")
  - Estado e handler para o novo diálogo
  - No submit, atualizar cada pedido selecionado com os dados da carga escolhida via `updateMut`

### Dados da carga copiados para cada pedido adicionado
`tipo_caminhao`, `placa`, `motorista`, `carga_id`, `horario_previsto`, `etapa: "logistica"`

