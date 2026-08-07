---
name: Varejo vs Distribuidores na portaria
description: Carga sem transportadora vai para portaria do Varejo; transportadora é obrigatória no fechamento/edição salvo marcação "Frota própria"
type: feature
---
A portaria decide o lado pela transportadora da carga: vazia = Varejo (frota própria), preenchida = Distribuidores (terceirizado).

Por isso, no fechamento de carga (FechamentoLoteDialog) e na edição (EditarCargaDialog) a Transportadora é obrigatória, com uma única exceção: o checkbox explícito "Frota própria (Varejo)", que limpa o campo e envia a carga intencionalmente ao Varejo.
