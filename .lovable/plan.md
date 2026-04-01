

# Vincular Caminhão Cadastrado no Fechamento de Carga

## Problema

O select "Vincular a veículo" no FechamentoLoteDialog mostra veículos esperados e veículos no pátio. O usuário quer que mostre os **caminhões cadastrados** (tabela `caminhoes`), pois os veículos esperados já estão associados a cargas fechadas.

## Mudança

### `src/components/dashboard/FechamentoLoteDialog.tsx`

1. **Remover** imports e uso de `useVeiculosEsperados` e `useMovimentacoes`
2. **Remover** toda a lógica de `veiculosPatio` e `veiculosEsperados`
3. **Importar** `useCaminhoes` e usar os caminhões cadastrados como opções do select
4. **Atualizar** o select para listar caminhões cadastrados com formato: `Placa - Motorista (Tipo)`
5. Ao selecionar, preencher placa, motorista, tipo_caminhao e demais campos vindos do cadastro

O campo `CaminhaoAutocomplete` de placa já existe abaixo — o select "Vincular" passa a ser um atalho rápido para selecionar um caminhão cadastrado completo (com motorista já vinculado).

