# Correção imediata — carga do André

## O que aconteceu

A auditoria confirmou que, às **19/06 11:44:59**, 67 itens / 7 pedidos foram removidos da carga `CG-20260617-103335-RBZ` e voltaram para:
- `etapa = vendas`
- `status = Aguardando`
- `carga_id = null`

Por isso eles voltaram a ficar disponíveis na Home.

Minha alteração anterior não moveu os pedidos, mas criou um card sintético na Expedição com **0 kg**, o que ficou errado nesse cenário, porque os pedidos existem — só estão soltos.

## Correção proposta

### 1. Restaurar os 67 itens na carga correta

Atualizar exatamente os registros identificados pelo `audit_log`, voltando os campos para os valores anteriores:

- `carga_id = CG-20260617-103335-RBZ`
- `nome_carga = EDIVAR + DMA`
- `placa = OZROD10`
- `motorista = ANDRE ROBERTO BELLAVER`
- `transportadora = MOREIRA`
- `tipo_caminhao = Carreta`
- `etapa = logistica`
- `status = Carregado`
- `ordem_entrega = valor anterior do audit_log`

Total previsto após restauração:
- **67 itens**
- **7 pedidos**
- **23.580,12 kg**

### 2. Ajustar o painel Expedição

Remover a lógica que cria card sintético com **0 kg** para carga órfã, porque isso mascara o problema real.

Depois disso, se uma saída da portaria existir sem pedidos vinculados, o painel não vai exibir um card falso de 0 kg; primeiro precisa corrigir a carga no banco.

### 3. Manter apenas a melhoria segura

Manter a melhoria que evita descartar a carga quando apenas uma linha está sem transportadora, pois isso não interfere na Home e evita perda de peso no painel.

## Validação

1. Conferir que `CG-20260617-103335-RBZ` voltou a ter 67 itens e peso total 23.580,12 kg.
2. Conferir que esses pedidos não aparecem mais disponíveis na Home.
3. Conferir que o painel Expedição mostra a carga do André com peso real, não 0 kg.
