

## Botão "Enviar pra Registro de Entrada" no Pátio Atual

### Contexto

O Welliton (terceirizado, placa RMB0C89, MOREIRA TRANSPORTES) está hoje na aba **Pátio Atual** porque alguém na portaria já registrou a entrada dele como movimentação de portaria (`movimentacoes_portaria` com `tipo_movimento=entrada`, `etapa_terceirizado=no_patio`). Nessa situação, ele **não tem carga vinculada** e a Logística não consegue mais fechar uma carga e amarrar a esse veículo, porque o fluxo de "vincular carga a walk-in" só funciona com registros que estejam em `veiculos_esperados` com status `aguardando_vinculo`.

### O que vai mudar

Adicionar um botão **"Enviar pra Registro de Entrada"** (ícone `Link2` ou `Undo2`) no card/linha do Pátio Atual, disponível **somente para terceirizados sem `carga_id`** (caso do Welliton). Não aparece em carga própria (que tem fluxo próprio com etapas) nem em terceirizado já vinculado a uma carga.

Quem vê o botão: admin e logística (não portaria — quem precisa "consertar" esse caso é a Logística pra depois conseguir vincular a carga).

### Comportamento ao clicar

Confirmação inline (mesmo padrão do "Saída Rápida" que já existe — Cancelar / Confirmar) e em seguida:

1. Cria um registro em `veiculos_esperados` com:
   - `placa`, `motorista`, `transportadora`, `tipo_veiculo` copiados da movimentação
   - `walk_in = true`
   - `status_autorizacao = 'aguardando_vinculo'`
   - `data_referencia = hoje`
   - `grupo = 'WALK-IN-TERCEIRIZADO'`
   - `observacoes = "Reaberto do Pátio Atual em <data> por <usuário> — entrada registrada às <hora>"`
2. Deleta a movimentação de entrada da portaria (o trigger de auditoria já registra quem apagou e o snapshot completo, então fica rastreável na Lixeira/Logs).
3. Invalida as queries relevantes (`movimentacoes_portaria`, `veiculos_walkin_ativos`, `veiculos_esperados`).
4. Toast: *"Veículo enviado para Registro de Entrada — disponível para vínculo de carga"*.

Resultado: o veículo desaparece do Pátio Atual e reaparece em **Registro de Entrada → "Aguardando vínculo da Logística"**, onde a Logística clica em **Vincular a carga**, escolhe a carga (que pode ser fechada agora ou depois), e o veículo retorna ao Pátio com a carga amarrada.

### Por que não só "vincular carga direto no Pátio Atual"

Cogitei adicionar um botão "Vincular carga" direto na linha do Pátio Atual, reaproveitando o `VincularCargaDialog`. Mas o vínculo atual só atualiza `veiculos_esperados` — não atualiza a `movimentacoes_portaria` que já existe no Pátio. Ia gerar inconsistência (carga aparecendo em `veiculos_esperados.carga_id` mas a entrada no Pátio sem `carga_id`). O caminho "voltar pra Registro de Entrada → vincular → liberar entrada de novo" reaproveita 100% do fluxo existente (que já cuida de propagar o `carga_id` na criação da nova movimentação) e fica auditável.

### Mudanças concretas

- ✏️ `src/components/portaria/PatioAtualTab.tsx`:
  - Helper `podeReabrirRegistro(m)` → `m.categoria === 'terceirizado' && !m.carga_id && (role === 'admin' || role === 'logistica')`.
  - Estado local `reabrirId` (mesmo padrão do `saidaRapidaId`) com confirmação inline.
  - Handler `handleReabrirRegistro(m)` que faz o INSERT em `veiculos_esperados` + DELETE em `movimentacoes_portaria` (sequencial, com rollback de toast em caso de erro).
  - Render: botão "Enviar pra Registro" antes do botão "Registrar Saída" no bloco de ações de terceirizado, só quando a condição bate.
- ➕ Pequeno hook `useReabrirComoWalkIn` em `src/hooks/useVeiculosEsperados.ts` (encapsula o INSERT+DELETE+invalidates+toast pra ficar testável e não inflar o componente).

### O que NÃO muda

- Sem migration, sem mexer no schema.
- Carga própria continua intocada (tem fluxo próprio Chegou → Em Rota → Retornou → Saída).
- Terceirizado **com carga já vinculada** não ganha o botão (já está no fluxo correto).
- Auditoria automática: o DELETE da movimentação cai no trigger `audit_movimentacoes` com snapshot completo, então o registro fica recuperável na Lixeira do Super Admin se algo der errado.

