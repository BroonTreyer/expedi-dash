
User quer que, após a Logística vincular uma carga a um veículo walk-in (status `aguardando_vinculo` → `autorizado`), o card **continue visível na página `/portaria/registro-entrada`** com badge "Liberado pela Logística", até que a Portaria clique em "Registrar Chegada" — daí cria a movimentação de entrada e o card sai da lista.

## Estado atual
- `SolicitacoesPendentesPanel` (em RegistroEntrada) usa `useSolicitacoesPendentes` que filtra apenas `["aguardando_vinculo", "aguardando_autorizacao"]` → após autorização, o card **some**.
- Hoje o porteiro precisa ir até `/portaria/terceirizado` ou `/portaria/carga-propria` no painel "Veículos Esperados" para registrar a chegada.

## Plano

### 1. `useVeiculosEsperados.ts` — novo hook
Criar `useVeiculosWalkInAtivos()` retornando walk-ins com `status_autorizacao IN ('aguardando_vinculo','autorizado')` AND ainda **não conferidos** (`conferido=false`). Ordenar: aguardando primeiro, autorizados depois (ou por created_at).

### 2. `SolicitacoesPendentesPanel.tsx` — renomear/expandir
- Trocar fonte de dados para o novo hook.
- Renderizar 2 grupos visuais:
  - **Aguardando vínculo da Logística** (badge âmbar "NO PÁTIO") — ações: Vincular a carga / Recusar (já existe).
  - **Liberados — aguardando registro de chegada** (badge verde "LIBERADO") — ação principal: **"Registrar Chegada"** (botão primary).
- Mostrar `carga_id`/`nome_carga` quando vinculado.

### 3. Botão "Registrar Chegada" (porteiro)
Ao clicar:
- Criar `movimentacoes_portaria` com:
  - `tipo_movimento='entrada'`
  - `categoria` derivado de `grupo` (`PRÓPRIA` → `carga_propria`, `TERCEIRIZADO` → `terceirizado`)
  - `placa`, `motorista`, `transportadora`, `tipo_caminhao`, `carga_id` copiados do `veiculo_esperado`
  - `etapa_terceirizado='aguardando_saida'` (para terceirizado) OU `etapa_carga_propria='aguardando_saida_rota'` (para frota própria) — alinhado com fluxo padrão
  - `horario_entrada=now()`, `usuario_id=auth.uid()`
- `UPDATE veiculos_esperados` SET `conferido=true`, `conferido_por`, `conferido_em=now()` → tira da lista.
- Toast: "Chegada registrada — veículo no pátio".
- Invalidar queries: `veiculos_esperados*`, `movimentacoes_portaria`.

Permissão: porteiros, logística, admin. (Apenas mostrar botão se `role` permitir.)

### 4. Trigger `on_walkin_status_change` (já cobre)
Notificação atual à `portaria` "Veículo X vinculado e liberado para entrada" continua válida — sem mudança.

## Arquivos
- ✏️ `src/hooks/useVeiculosEsperados.ts` (novo hook + novo `useRegistrarChegadaPortaria`)
- ✏️ `src/components/portaria/SolicitacoesPendentesPanel.tsx` (2 grupos, botão Registrar Chegada)

## Sem mudanças em
- Schema, RLS, triggers, rotas, `RegistroEntradaDialog`, `FechamentoLoteDialog`.

## Verificação importante
Preciso checar valores válidos de `etapa_terceirizado` / `etapa_carga_propria` lidos em `RegistroEntradaDialog` ou hooks de movimento existentes para usar a string correta de "veículo no pátio aguardando saída" — vou consultar `useMovimentacoesPortaria.ts` / `RegistroEntradaDialog.tsx` ao implementar.
