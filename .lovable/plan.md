## Diagnóstico

A linha do print é o **Pedido 145 — JR DISTRIBUIDORA — Araguaína/TO**, com 26 produtos somando **30.205 kg**, vendedor ALCIR. Todos os 26 itens estão em `carregamentos_dia` da data **13/05/2026** com:

- `carga_id = NULL`
- `nome_carga = NULL`
- `transportadora`, `placa`, `motorista`, `tipo_caminhao` em branco
- `status = "Pronto para carregar"`

Por isso ele não aparece como carga em lugar nenhum (Expedição, KPIs, Cargas do dia).

Do outro lado, na portaria, o motorista **FAGNO PEREIRA ALMEIDA** chegou hoje 13/05 às 12:46 com a placa **QWE1B20** e o operador digitou `carga_id = 'JR'` no campo de carga (movimento `f23697ed…`, etapa "no_patio"). Esse `JR` não casa com nenhuma carga real do dia — é só texto livre.

Histórico do Fagno: ele rodou anteriormente como **JR TRANSPORTES / Carreta**, com cargas chamadas `JR` (27/04) e `JR ROTA` (07/05).

## Solução proposta

Transformar o Pedido 145 numa carga real, atribuindo a ele os mesmos dados do veículo do Fagno que já está no pátio. Assim a carga aparece nos painéis e o card do Fagno passa a mostrar os 30.205 kg.

Atualizar os **26 itens** de `carregamentos_dia` (data = 2026-05-13, numero_pedido = 145, cliente = JR DISTRIBUIDORA, todos com `carga_id IS NULL`) com:

- `carga_id` = **`JR`** (mesmo valor já gravado no movimento do Fagno → vínculo automático)
- `nome_carga` = **`JR`**
- `transportadora` = **`JR TRANSPORTES`**
- `placa` = **`QWE1B20`**
- `motorista` = **`FAGNO PEREIRA ALMEIDA`**
- `tipo_caminhao` = **`Carreta`**

Não mexo no movimento da portaria — ele já está com `carga_id = 'JR'`, então no momento em que os itens receberem `carga_id = 'JR'` o vínculo é imediato.

## Resultado esperado

- A carga **JR (Fagno / QWE1B20)** passa a existir na expedição de hoje com 30.205 kg / 26 produtos / 1 pedido.
- O card do Fagno em "No Pátio" deixa de aparecer sem peso e passa a exibir 30.205 kg e o cliente.
- KPIs de "A carregar" do dia incorporam esses 30.205 kg.

## Confirmação necessária

Confirma que devo:
1. Usar exatamente o nome de carga **`JR`** (igual ao que o porteiro digitou) — ou prefere **`JR ROTA`**?
2. Manter transportadora **JR TRANSPORTES** e tipo **Carreta** como nas cargas anteriores do Fagno?

Assim que você confirmar, executo o update nos 26 itens.