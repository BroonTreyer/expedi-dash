## Adicionar "Saiu sem carregar" também na Portaria → Pátio Atual

O botão já existe no painel da Expedição, mas o print do usuário é de outra tela: `PatioAtualTab.tsx` (rota `/portaria/terceirizado` → aba "Pátio Atual"), onde hoje só há "Enviar p/ Registro" e "Registrar Saída".

### Mudança

Em `src/components/portaria/PatioAtualTab.tsx`, no bloco `terceirizado | fornecedor` (linha ~522, quando não está em modo "reabrir"), adicionar um botão fantasma de ícone `LogOut` ao lado de "Registrar Saída":

- Tooltip: **"Saiu sem carregar (desistiu)"**.
- Visível para `admin`, `logistica`, `portaria` (mesma regra dos outros botões da aba).
- Ao clicar: abre `AlertDialog` mostrando placa / motorista / tempo no pátio + textarea opcional de motivo.
- Confirmar → `update` em `movimentacoes_portaria`:
  - `etapa_terceirizado = 'finalizado'`
  - `horario_saida_final = now()`
  - `observacoes` recebe linha extra `[dd/MM/yyyy HH:mm] Saiu sem carregar — <email>[: <motivo>]`
- Invalida as queries `movimentacoes_portaria`, `movimentacoes_ativas_patio`, `cargas_fechadas_aguardando`, `patio_atual`.

A linha some imediatamente do Pátio Atual e o registro fica no histórico marcado como "Saiu sem carregar".

### Por que não deletar

- Mantém histórico/auditoria (placa esteve no pátio).
- Não quebra vínculo com `carga_id`.
- Admin ainda pode apagar pela tela Admin da Portaria se for engano grosseiro.

### Arquivo afetado

- `src/components/portaria/PatioAtualTab.tsx` — adicionar imports (`LogOut`, AlertDialog, Textarea, Label), estado local (`desistirId`, `motivo`, `busy`), handler `marcarSaiuSemCarregar`, e renderizar o botão + dialog dentro do bloco `terceirizado/fornecedor`. Aplicar também na renderização mobile (linha ~741) se existir o mesmo botão lá.

Nenhuma alteração de schema, RLS ou outros componentes.