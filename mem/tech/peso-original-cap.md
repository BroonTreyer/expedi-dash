---
name: peso-original cap trigger
description: Subir peso acima de peso_original em carregamentos_dia exige enviar peso_original junto, senão trigger cap_peso_pelo_original reverte
type: feature
---
Tabela `carregamentos_dia` tem trigger BEFORE UPDATE `cap_peso_pelo_original`:
se `peso > peso_original * 1.001`, força `peso := peso_original`.

Implicação: qualquer UPDATE que AUMENTE peso PRECISA enviar `peso_original = peso`
no mesmo payload, senão a edição é silenciosamente revertida pelo banco
(UI fica otimisticamente correta, realtime traz o valor antigo).

Tratado em `CarregamentoDialog.handleSubmit` → helper `rupturaFieldsForItem`.
Outros caminhos de UPDATE (`useEditarPedidoAprovacao`, batch updates, etc.)
devem seguir a mesma regra.
