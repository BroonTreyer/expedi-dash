# Pedido do Elias "sumiu" ao ser incluído na carga ELIAS ROTA

## O que aconteceu (confirmado no banco)

Existem **duas cargas com o mesmo nome "ELIAS ROTA"**:

| Carga | Data | OC | Situação |
|---|---|---|---|
| CG-20260820-114242-8D5 | 18/08/2026 | 132749 | carga antiga |
| CG-20260827-151957-59M | 27/08/2026 | 133180 | carga de hoje (50 itens) |

O pedido 47 (cliente ELIAS, código 23709 — BACON PEDAÇOS 6KG e CALABRESA GROSSA 2KG, criado hoje 15:26) foi gravado na **carga antiga de 18/08**, com `data = 2026-08-18` e `status = "Aguardando"`, enquanto os itens da carga de hoje estão em `status = "Pronto para carregar"`. Por isso ele desapareceu do painel: caiu num dia passado e numa carga diferente da que estava sendo montada.

## Correção dos dados

Mover os 2 itens do pedido 47 para a carga de hoje:
- `carga_id` → CG-20260827-151957-59M, `ordem_carga` → 133180
- `data` → 2026-08-27
- `status` → "Pronto para carregar" (igual aos irmãos da carga)
- manter etapa `logistica`, placa/transportadora/tipo de caminhão da carga de destino

## Prevenção

1. **Desambiguar cargas homônimas na seleção**: no diálogo de inclusão de pedido em carga fechada, exibir junto ao nome da carga a data e a OC (ex.: "ELIAS ROTA · 27/08 · OC 133180"), e ordenar as cargas mais recentes primeiro, para não haver escolha às cegas entre duas "ELIAS ROTA".
2. **Herdar contexto da carga de destino**: ao anexar, o pedido passa a copiar `data`, `status`, `ordem_carga` e dados de transporte da carga escolhida, em vez de manter a data/status próprios — evitando que o item caia num dia onde ninguém o vê.
3. **Aviso de data divergente**: se a carga escolhida for de data anterior a hoje, mostrar alerta confirmando ("esta carga é de 18/08; o pedido não aparecerá no painel de hoje").

## Detalhes técnicos

- Dados: UPDATE em `carregamentos_dia` nos ids `64bd5110-…` e `205a8a26-…`.
- Código: `src/components/dashboard/AdicionarCargaDialog.tsx` (lista de cargas + herança de campos + alerta de data). Sem alteração de schema.
