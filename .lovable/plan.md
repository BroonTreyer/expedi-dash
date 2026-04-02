
# Corrigir o Pão de Alho ainda aparecendo com 240 kg

## Problema raiz confirmado
O cadastro do produto já está correto: os códigos **810–814** estão com `peso_padrao = 0.4`.

O erro que continua aparecendo não está mais no cadastro de produto. Ele está nos **registros já salvos** em `carregamentos_dia`, porque a tela de rupturas soma o campo **`peso` gravado na linha**, e não recalcula com base no cadastro atual.

Evidência encontrada:
- `produtos.814` = `0.4`
- em `carregamentos_dia`, as rupturas do código **814** ainda somam **`total_qtd = 60`** e **`total_peso = 240`**

Ou seja: o sistema está exibindo um **peso antigo persistido no banco**, não o peso novo do produto.

## O que implementar

### 1. Corrigir os dados já gravados
Atualizar os registros existentes de Pão de Alho em `carregamentos_dia` para recalcular:
```text
peso = quantidade * 0.4
```

Escopo recomendado:
- códigos `810`, `811`, `812`, `813`, `814`
- priorizar pelo menos os registros de ruptura e pendentes
- idealmente corrigir todos os registros em que o peso foi salvo com a lógica antiga

### 2. Blindar o fluxo para não voltar a acontecer
No envio do pedido, garantir que o `peso` final seja derivado novamente de:
```text
pesoPadrao × quantidade
```
em vez de confiar apenas no valor que já estava no estado local.

Arquivo principal:
- `src/components/dashboard/CarregamentoDialog.tsx`

Isso evita que um item fique com peso antigo em casos de cache/local state inconsistente.

### 3. Validar os pontos onde o valor aparece
As telas abaixo usam o `peso` salvo no carregamento e por isso refletem o erro histórico:
- `src/pages/Rupturas.tsx`
- `src/components/dashboard/RupturasPrintDialog.tsx`
- `src/components/dashboard/CarregamentoTable.tsx`

Depois do ajuste dos dados, essas telas devem passar a mostrar:
```text
60 unid
24 kg
```
em vez de `240 kg`.

## Detalhes técnicos

### Dados a corrigir
Tabela:
- `carregamentos_dia`

Regra:
```text
para códigos 810–814:
novo peso = quantidade * 0.4
```

### Código a endurecer
Arquivo:
- `src/components/dashboard/CarregamentoDialog.tsx`

Mudança:
- recalcular `peso` no `handleSubmit` para cada item antes de enviar `onSubmit`

## Validação após a correção
1. Abrir a tela de Rupturas e verificar o código **814**
2. Confirmar que o resumo mostra **60 unid / 24 kg**
3. Confirmar que impressão de rupturas mostra o mesmo valor
4. Criar um novo pedido de Pão de Alho e validar que novos registros já nascem com peso correto
5. Rodar o build para garantir que não ficou nenhuma quebra de TypeScript/import

## Resultado esperado
- o cadastro de produto continua em `0.4`
- os registros antigos deixam de carregar `240 kg`
- a ruptura passa a exibir o valor correto
- novos pedidos não voltam a gravar o peso antigo
