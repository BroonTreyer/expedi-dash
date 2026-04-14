

## Plano: Vinculação bidirecional Placa ↔ Motorista ↔ Transportadora no Fechamento de Carga

### Problema atual
- Os campos Placa e Motorista no `FechamentoLoteDialog` já usam autocomplete, mas **não fazem cross-fill bidirecional** corretamente (digitar motorista preenche placa, mas digitar placa não preenche motorista no mesmo fluxo).
- O campo **Transportadora** é um `Input` livre, sem vínculo ao cadastro de caminhões.
- A tabela `caminhoes` **não tem coluna `transportadora`**, então não existe onde armazenar essa relação.

### O que será feito

**1. Migração de banco de dados**
- Adicionar coluna `transportadora TEXT` na tabela `caminhoes`.

**2. Atualizar hook `useCaminhoes`**
- Incluir `transportadora` no retorno da interface `Caminhao`.

**3. Atualizar `CaminhaoAutocomplete`**
- No `onSelect`, incluir `motorista` (nome) e `transportadora` nos dados retornados para o pai.

**4. Atualizar `MotoristaAutocomplete`**
- No lookup de caminhão vinculado, incluir `transportadora` no retorno do `onSelect`.

**5. Atualizar `FechamentoLoteDialog` — cross-fill bidirecional**
- Quando o usuário **digita a placa** e seleciona no `CaminhaoAutocomplete`:
  - Preenche automaticamente: `motorista`, `tipo_caminhao`, `transportadora`.
- Quando o usuário **digita o motorista** e seleciona no `MotoristaAutocomplete`:
  - Preenche automaticamente: `placa`, `tipo_caminhao`, `transportadora`.
- Quando o usuário seleciona no dropdown **"Vincular a veículo"**:
  - Preenche todos os campos como já faz, agora incluindo `transportadora`.

**6. Atualizar página de Caminhões (cadastro)**
- Adicionar campo `Transportadora` nos formulários de criação e edição de caminhões para que o dado possa ser persistido.

### Detalhes técnicos
- Migração SQL: `ALTER TABLE public.caminhoes ADD COLUMN transportadora TEXT;`
- O `CaminhaoAutocomplete.onSelect` passa a retornar `{ placa, tipo_caminhao, motorista, telefone, cpf, renavam, transportadora }`.
- O `MotoristaAutocomplete.onSelect` passa a retornar `{ nome_completo, telefone, cpf, placa, tipo_caminhao, transportadora }`.
- No `FechamentoLoteDialog`, os handlers `onSelect` de ambos os autocompletes preenchem `setTransportadora()` junto com os demais campos.

