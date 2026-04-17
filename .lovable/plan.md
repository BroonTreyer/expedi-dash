
User esclarece o fluxo correto:

1. **Portaria registra "Registro de Entrada"** → já conta como **chegada** (horário de chegada = agora). Veículo aparece como "aguardando vínculo" para a Logística.
2. **Logística vincula carga** → status vira `autorizado`. Card continua na lista de Registro de Entrada com badge "LIBERADO".
3. **Portaria clica "Liberar Entrada"** (renomear de "Registrar Chegada") → cria a movimentação de entrada com `horario_entrada=now()` e `horario_chegada=` o horário em que foi registrado em Registro de Entrada (não agora). Veículo entra no pátio.
4. Daí em diante, fluxo normal de saída (terceirizado/própria).

## Diferença vs hoje
Hoje `useRegistrarChegadaPortaria` está usando `horario_chegada=now()` e `horario_entrada=now()` no momento do clique. O correto é:
- `horario_chegada` = `veiculo_esperado.created_at` (quando porteiro registrou em Registro de Entrada)
- `horario_entrada` = `now()` (quando Logística liberou e porteiro confirmou liberação)
- `data_hora` = `now()`

E renomear o botão/copy de **"Registrar Chegada"** → **"Liberar Entrada"** (alinhado com o print enviado).

## Plano

### `src/hooks/useVeiculosEsperados.ts`
Em `useRegistrarChegadaPortaria`:
- Trocar `horario_chegada: nowIso` por `horario_chegada: v.created_at` (chegada física = momento do Registro de Entrada).
- Manter `horario_entrada: nowIso` e `data_hora: nowIso`.
- Toast: *"Entrada liberada — veículo no pátio"*.

### `src/components/portaria/SolicitacoesPendentesPanel.tsx`
- Renomear botão **"Registrar Chegada"** → **"Liberar Entrada"** (ícone `LogIn` em vez de `ArrowDownToLine`).
- Renomear título do grupo **"Liberados — aguardando registro de chegada"** → **"Liberados — aguardando liberação de entrada"**.

## Sem mudanças em
- Schema, RLS, triggers, `RegistroEntradaDialog`, `FechamentoLoteDialog`, rotas, Pátio/Histórico/Esperados.

## Arquivos
- ✏️ `src/hooks/useVeiculosEsperados.ts` (origem do `horario_chegada`)
- ✏️ `src/components/portaria/SolicitacoesPendentesPanel.tsx` (copy do botão e do grupo)
