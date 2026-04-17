
User quer reformular o fluxo "Chegada sem previsão" → **"Registro de Entrada"**:

1. Renomear no menu, página, dialog, ícone (de alerta âmbar para entrada neutra).
2. Mudar semântica: ao registrar, motorista+placa fica **disponível como "veículo no pátio aguardando vínculo"** — Logística vê na hora de fechar carga e pode vincular.
3. Quando Logística fecha a carga vinculando esse veículo → **autoriza automaticamente** → veículo entra no pátio (etapa "Liberado").
4. Portaria segue fluxo normal de saída (terceirizado: Saída / própria: Saída Rota → Retorno → Lacre).

## Análise do que já existe
- `veiculos_esperados` já tem `status_autorizacao` (`previsto | aguardando_autorizacao | autorizado | recusado`) e `walk_in: bool`.
- `RegistroChegadaWalkInDialog` já vincula motorista + placa.
- `FechamentoLoteDialog` (fechamento de carga) já permite escolher caminhão via `CaminhaoAutocomplete`.
- Hoje walk-in fica preso em "aguardando_autorizacao" até logística clicar em aprovar manualmente no `SolicitacoesPendentesPanel`.

## Plano

### 1. Renomeação (cosmético)
- **`AppSidebar.tsx`**: item "Chegada sem previsão" → **"Registro de Entrada"**, ícone `LogIn` (em vez de `AlertCircle`).
- **`src/pages/ChegadaSemPrevisao.tsx`** → renomear para **`RegistroEntrada.tsx`** (atualizar import em `App.tsx` e rota `/registro-entrada`; manter `/chegada-sem-previsao` redirecionando por compat).
  - Header: "Registro de Entrada" / descrição: *"Registre a entrada de veículos no pátio. A Logística poderá vincular esses veículos no fechamento de carga."*
  - Trocar ícone âmbar `AlertCircle` por `LogIn` neutro (primary).
- **`RegistroChegadaWalkInDialog.tsx`** → renomear para **`RegistroEntradaDialog.tsx`**:
  - Título: *"Registrar Entrada — Frota Própria/Terceirizado"*
  - Descrição: *"Vincule motorista e veículo já cadastrados. O veículo ficará disponível para a Logística vincular ao fechar uma carga."*
  - Botão: *"Registrar Entrada"* (em vez de "Solicitar autorização").

### 2. Mudança de status semântico
No hook `useRegistrarChegadaWalkIn` (em `useVeiculosEsperados.ts`):
- Alterar `status_autorizacao` inserido de `"aguardando_autorizacao"` → **`"aguardando_vinculo"`** (novo estado lógico — armazenado como string, não precisa migration de enum, é coluna `text`).
- Toast: *"Entrada registrada — aguardando vínculo de carga pela Logística"*.

### 3. Logística vê veículos disponíveis no fechamento de carga
**`FechamentoLoteDialog.tsx`** (modificar):
- Buscar `veiculos_esperados` com `walk_in=true AND status_autorizacao='aguardando_vinculo'` filtrados por placa (autocomplete já existe via `CaminhaoAutocomplete`).
- Adicionar **seção destacada** acima do autocomplete: *"Veículos no pátio aguardando vínculo"* — lista de cards clicáveis (placa + motorista + horário de chegada) que ao clicar preenchem placa/motorista/transportadora/tipo no formulário de fechamento.
- Ao confirmar fechamento com placa que bate com um `veiculo_esperado` walk-in pendente:
  - **UPDATE** `veiculos_esperados` desse registro: `status_autorizacao='autorizado'`, `carga_id=<carga gerada>`, `autorizado_em=now()`, `autorizado_por=auth.uid()`.

### 4. Painel "Solicitações pendentes"
- **Manter** `SolicitacoesPendentesPanel` para casos onde Logística queira recusar uma entrada (ex.: placa errada/não esperada) sem precisar vincular carga. Apenas filtrar por novo status `aguardando_vinculo` em vez de `aguardando_autorizacao`.
- Renomear painel para **"Veículos no pátio aguardando vínculo"**.
- Trocar botão "Autorizar" por **"Vincular a carga"** (link/atalho para `/portaria` ou roteirização) + manter "Recusar" (com motivo).

### 5. Trigger de notificação
**Migration**: ajustar `on_walkin_status_change()` para também tratar transição `aguardando_vinculo → autorizado` (já cai no ramo `autorizado` existente, mas o INSERT precisa cobrir o novo status):
- INSERT com `status_autorizacao='aguardando_vinculo'` → notifica role `logistica` + `admin`: *"Entrada registrada — Veículo XXX aguardando vínculo de carga"*.
- UPDATE para `autorizado` → mantém notificação atual à `portaria`: *"Veículo XXX vinculado e liberado"* (ajustar mensagem).

### 6. Painel "Veículos Esperados" (Portaria)
Já mostra walk-ins autorizados na janela ±3 dias — sem mudança. Porteiro clica em **"Registrar Chegada"** → cria movimentação de entrada → fluxo normal de saída segue.

> Observação: o veículo já está "no pátio" fisicamente desde a etapa 1, mas no sistema a movimentação de entrada (`movimentacoes_portaria.tipo_movimento='entrada'`) só é criada quando porteiro confirma. Mantemos isso para preservar o fluxo padrão e evitar duplicação.

## Arquivos
- ✏️ `src/components/AppSidebar.tsx`
- 🔄 `src/pages/ChegadaSemPrevisao.tsx` → `RegistroEntrada.tsx`
- 🔄 `src/components/portaria/RegistroChegadaWalkInDialog.tsx` → `RegistroEntradaDialog.tsx`
- ✏️ `src/App.tsx` (rota nova + alias antigo)
- ✏️ `src/hooks/useVeiculosEsperados.ts` (status `aguardando_vinculo`, novo hook `useVeiculosAguardandoVinculo`)
- ✏️ `src/components/portaria/SolicitacoesPendentesPanel.tsx` (filtro novo status, copy, ações)
- ✏️ `src/components/dashboard/FechamentoLoteDialog.tsx` (seção veículos no pátio + auto-autorização ao vincular)
- 🆕 Migration: ajustar trigger `on_walkin_status_change` para reconhecer `aguardando_vinculo`.

## Sem mudanças em
- Schema da tabela `veiculos_esperados` (coluna é `text`, aceita novo valor).
- RLS, fluxo de saída de portaria, painel `VeiculosEsperadosPanel`.
