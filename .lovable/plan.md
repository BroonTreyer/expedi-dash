
User quer um fluxo completo para motoristas **walk-in** (não cadastrados e não previstos):

1. Motorista chega → Portaria cria cadastro rápido (placa + motorista) e o coloca em uma fila "Aguardando autorização".
2. Logística vê a fila em tempo real e **libera** ou **recusa**.
3. Liberado → Portaria registra **entrada** normal.
4. Saída → Portaria registra **saída** normal.

Olhando o que já existe:
- `veiculos_esperados` tem campo `conferido` (chegou) e RLS permite Portaria inserir/atualizar.
- `movimentacoes_portaria` registra entrada/saída.
- `notify_role` + Realtime já em uso.
- Faltam: campos para "solicitação walk-in" (status pendente/aprovado/recusado) + tela de aprovação para Logística.

## Plano

### 1. Banco — migration
Adicionar à `veiculos_esperados`:
- `walk_in boolean default false` — flag de chegada não prevista.
- `status_autorizacao text default 'previsto'` — valores: `previsto` | `aguardando_autorizacao` | `autorizado` | `recusado`.
- `autorizado_por uuid`, `autorizado_em timestamptz`, `motivo_recusa text`.

Trigger nova `on_solicitacao_walkin`: quando `INSERT` com `status_autorizacao='aguardando_autorizacao'` → `notify_role('logistica', ...)`. Quando muda para `autorizado`/`recusado` → notifica `portaria`.

### 2. Hook `useVeiculosEsperados.ts`
- Nova mutation `useRegistrarChegadaWalkIn({ placa, motorista, transportadora?, tipo_veiculo?, observacoes? })` → INSERT com `walk_in=true`, `status_autorizacao='aguardando_autorizacao'`, `data_referencia=hoje`, `grupo='WALK-IN'`.
- Nova mutation `useAutorizarChegada(id, autorizar: boolean, motivo?)` → UPDATE status + carimbo de usuário.
- Nova query `useSolicitacoesPendentes()` → lista onde `status_autorizacao='aguardando_autorizacao'`.

### 3. Componente novo `RegistroChegadaWalkInDialog.tsx` (Portaria)
Botão **"Chegada sem previsão"** no painel de Veículos Esperados. Form: placa (PlacaInput + OCR), motorista (MotoristaAutocomplete que permite criar novo motorista on-the-fly via `useCreateMotorista` — já existe), tipo de veículo, transportadora opcional, observações.
- Submit → cria motorista (se novo) + cria registro walk-in pendente.
- Toast: "Aguardando autorização da Logística".

### 4. Aba "Aguardando Autorização" no painel
Em `VeiculosEsperadosPanel.tsx`: nova sub-aba/seção no topo com badge contador, listando solicitações `aguardando_autorizacao` em tempo real (Realtime). Para cada item:
- Card com placa, motorista, transportadora, hora da solicitação.
- Botões **Liberar** (verde) e **Recusar** (vermelho com prompt de motivo).
- Visível para `admin`, `logistica`, `portaria` — mas botões de ação só para `admin`/`logistica`.
- Quando liberado: o item aparece na lista de esperados normais com flag visual "Walk-in autorizado" e botão **Registrar Entrada** (fluxo já existente).

### 5. Visual
- Badge "WALK-IN" amarelo em itens que têm `walk_in=true`.
- Badge "Pendente autorização" laranja pulsante.
- Linha vermelha para recusados (some após 1h via filtro de tempo).

### Arquivos
- ✏️ migration SQL (campos + trigger)
- ✏️ `src/hooks/useVeiculosEsperados.ts` (3 funções novas)
- 🆕 `src/components/portaria/RegistroChegadaWalkInDialog.tsx`
- 🆕 `src/components/portaria/SolicitacoesPendentesPanel.tsx`
- ✏️ `src/components/portaria/VeiculosEsperadosPanel.tsx` (botão + aba pendentes)
- ✏️ `src/components/portaria/MotoristaAutocomplete.tsx` (verificar se já permite "Cadastrar novo" inline; se não, adicionar atalho)

### Sem mudanças em
- `movimentacoes_portaria` (fluxo de entrada/saída já existe e será reaproveitado).
- RLS (já cobrem).
- Rotas / permissões base.
