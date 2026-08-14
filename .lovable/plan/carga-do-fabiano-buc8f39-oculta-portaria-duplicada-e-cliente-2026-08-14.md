# Carga do Fabiano (BUC8F39) — oculta, portaria duplicada e cliente fora de Distribuidores

## O que está acontecendo (confirmado no banco)

Carga `CG-20260814-110428-TZH` — Fabiano dos Santos Nogueira, placa BUC8F39, DOMINIOS TRANSPORTES, OC 132717, 55 linhas / 9 pedidos.

São três problemas somados:

1. **Data da carga errada → carga "oculta".** Todas as 55 linhas estão com `data = 04/08/2026`, mas a carga foi montada/fechada em **14/08**. As telas do dia filtram por essa data, então a carga não aparece na esteira; só o Consolidado (que agrupa por carga) mostra. Foi fechada com o seletor de data em 04/08 e o sistema aceitou sem avisar.
2. **Portaria criou processo separado.** Existe um veículo esperado (walk-in de 12/08) já vinculado a essa carga, porém `conferido = false`, e o movimento de entrada da portaria (12/08, etapa "chegada") está com **carga_id vazio**. Ou seja: o vínculo existe do lado da logística, mas o movimento na portaria ficou solto — daí a portaria "não ver" a carga e abrir outro registro.
3. **Clientes não são distribuidores.** Os 9 clientes da carga (FRIOS E GRAOS, IGACENTER, LACTOFRIOS, JBS, CR FRIOS, ITAPUA, CESTA BASICA, ELIAS, ANDERSON GAVIAO) estão todos cadastrados como tipo **"outros"**. A página Distribuidores só lista clientes marcados como distribuidor — por isso a carga não aparece lá.

Há também uma duplicidade pontual: pedido 18 (FRIOS E GRAOS) tem a linha de CALABRESA 400G lançada duas vezes.

## Correção desta carga

- Ajustar a data das 55 linhas para **14/08/2026**, para a carga voltar a aparecer na esteira e nos painéis do dia.
- Vincular o movimento de portaria de 12/08 (BUC8F39) à carga `CG-20260814-110428-TZH` e marcar o veículo esperado como conferido, eliminando o processo duplicado — sem apagar histórico.
- Remover a linha duplicada de CALABRESA 400G do pedido 18.
- Marcar os clientes dessa carga como **distribuidor** (é o que define o lado Distribuidores). Confirmo com você antes se algum deles for varejo.

## Prevenção (para não repetir)

- **Aviso de data divergente no fechamento:** se a data escolhida for diferente do dia atual (ou dos pedidos), o diálogo mostra alerta claro "Esta carga será datada em dd/MM — vai sair da esteira de hoje" com confirmação explícita.
- **Vínculo automático mais firme na portaria:** ao fechar carga com veículo já no pátio/walk-in da mesma placa, o movimento de entrada em aberto recebe o `carga_id` da carga (hoje só o veículo esperado é vinculado). Assim a portaria vê a carga em vez de abrir outro registro.
- **Painel de cargas sem vínculo na portaria:** destacar movimentos com placa que casa com carga fechada e `carga_id` vazio, com botão "Vincular" — evita processo paralelo.
- **Sugestão de distribuidor:** cliente que entra em carga com transportadora e não está marcado como distribuidor já aparece nas sugestões da página Distribuidores; vou deixar o aviso mais visível para não ficar cliente invisível.

## Detalhes técnicos

- Correções de dados por SQL: `carregamentos_dia.data` da carga, `movimentacoes_portaria.carga_id` do movimento aberto de BUC8F39, `veiculos_esperados.conferido`, delete da linha duplicada, `clientes.tipo`.
- `src/components/dashboard/FechamentoLoteDialog.tsx`: alerta/confirmação de data divergente.
- `src/hooks/useCarregamentos.ts` (fechamento de carga) + trigger `on_carga_fechada`: propagar `carga_id` para o movimento de entrada em aberto da mesma placa.
- `src/components/portaria/PatioAtualTab.tsx`: destaque e ação de vincular para movimentos sem `carga_id` com placa de carga fechada.
- `src/pages/Distribuidores.tsx`: sugestões em evidência.
