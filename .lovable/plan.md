
User quer simplificar drasticamente o `RegistroChegadaWalkInDialog`: remover campos de criação/cadastro (transportadora, tipo veículo, destino, observações livres) e deixar só **2 campos de busca** vinculando registros já existentes:

1. **Buscar motorista** (autocomplete em `motoristas`)
2. **Buscar veículo/placa** (autocomplete em `caminhoes` — já existe `CaminhaoAutocomplete.tsx`)

Sem digitação livre de placa, sem criação de novo cadastro. Se o motorista/veículo não existir, ele deve ser cadastrado antes em Cadastros (fluxo separado).

## Plano

### `src/components/portaria/RegistroChegadaWalkInDialog.tsx` — refatoração
Substituir o conteúdo do form por apenas dois autocompletes:

- **Buscar motorista**: usa `MotoristaAutocomplete` existente. Ao selecionar, captura `nome_completo`, `transportadora` e `tipo_caminhao` do motorista (autofill silencioso para enviar ao backend).
- **Buscar veículo (placa)**: usa `CaminhaoAutocomplete` existente. Ao selecionar, captura `placa`, `tipo_caminhao`, `transportadora` e — se o caminhão tiver motorista vinculado e o campo motorista estiver vazio — preenche também o motorista.

Remover do dialog: `PlacaInput`, `transportadora` (input), `tipoVeiculo` (select), `destino` (input), `observacoes` (textarea) e o select de `useTiposCaminhao`.

Validação do submit: exigir **placa selecionada** + **motorista selecionado** (ambos vindos de busca, não digitados).

Submit envia para `useRegistrarChegadaWalkIn` apenas:
- `placa` (do veículo selecionado)
- `motorista` (nome do motorista selecionado)
- `transportadora` (autofill: prioriza a do veículo, depois a do motorista)
- `tipo_veiculo` (autofill: prioriza a do veículo, depois a do motorista)
- `grupo` (`WALK-IN-PROPRIA` ou `WALK-IN-TERCEIRIZADO` conforme escolha do card)

Manter o aviso "Aguardando autorização da Logística".

Adicionar um link/texto auxiliar no rodapé do dialog: *"Motorista ou veículo não encontrado? Cadastre em Cadastros → Motoristas/Caminhões."* (apenas texto, sem navegação automática).

### Sem mudanças em
- Banco, RLS, hook `useVeiculosEsperados.ts` (a mutation já aceita esses campos como opcionais), página `ChegadaSemPrevisao.tsx`, `SolicitacoesPendentesPanel`, fluxo de aprovação.

### Resultado
Ao clicar em "Frota Própria" ou "Terceirizado", o dialog abre com apenas dois campos de busca claros e diretos — vincula motorista + veículo já cadastrados e envia a solicitação à Logística.
