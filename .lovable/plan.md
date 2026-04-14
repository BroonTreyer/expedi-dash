

# Inverter relação motorista→placa e trocar ordem Peso/Qtd

## 1. Motorista puxa placa (em vez de placa puxar motorista)

**Onde**: `FechamentoLoteDialog.tsx` (fechamento de carga) e `CarregamentoDialog.tsx` (logística/editar)

**Hoje**: o campo Placa usa `CaminhaoAutocomplete` que busca por placa e preenche motorista.
**Depois**: o campo Motorista vem primeiro e, ao selecionar um motorista, busca na tabela `caminhoes` o veículo vinculado a ele, preenchendo automaticamente placa, tipo de caminhão, etc.

### Alterações

**`src/components/portaria/MotoristaAutocomplete.tsx`**
- Ampliar o callback `onSelect` para também retornar `placa` e `tipo_caminhao` do caminhão vinculado ao motorista
- Fazer um lookup na tabela `caminhoes` (via o hook existente ou query direta) quando um motorista é selecionado, buscando `caminhoes.motorista_id = motorista.id`

**`src/hooks/useCaminhoes.ts`**
- Adicionar hook `useCaminhaoPorMotorista(motoristaId)` que busca o caminhão ativo vinculado a um motorista específico

**`src/components/dashboard/FechamentoLoteDialog.tsx`**
- Reordenar os campos: Motorista antes de Placa
- No `onSelect` do `MotoristaAutocomplete`, preencher automaticamente placa e tipo de caminhão
- Manter o campo Placa editável (caso o motorista use outro veículo)

**`src/components/dashboard/CarregamentoDialog.tsx`** (seção logística, linhas 495-510)
- Reordenar: Motorista antes de Placa
- Ao digitar/selecionar motorista, buscar caminhão vinculado e preencher placa e tipo

## 2. Inverter ordem Peso ↔ Quantidade nos produtos

**Onde**: `CarregamentoDialog.tsx`, grid de produtos (linhas 425-445)

**Alteração**: trocar a posição das colunas — Peso (kg) vem antes de Qtd. Ajustar tanto os labels do header quanto os inputs, no desktop e mobile.

---

3 arquivos alterados, 1 hook novo. Sem migração necessária.

