## Adicionar botão "Desistiu / Saiu sem carregar" no card "No Pátio"

Hoje o painel **No Pátio** (`/portaria/terceirizado`) só permite seguir o fluxo normal (carregar → liberar saída). Quando o motorista entra no pátio e vai embora sem carregar, o registro fica eternamente lá, inflando o KPI e poluindo a tela.

### Comportamento proposto

Em cada card de veículo no pátio, adicionar um botão discreto de ícone (lixeira / `LogOut`) no canto direito, ao lado do "tempo no pátio". Visível apenas para `admin`, `logistica` e `portaria` (mesma regra do "Descartar chegada" do painel "Chegou").

Ao clicar:

1. Abrir um `AlertDialog` de confirmação mostrando placa, motorista e tempo no pátio.
2. Campo opcional de observação (textarea) — ex.: "desistiu, foi embora".
3. Ao confirmar, **encerrar** o movimento (não apaga, preserva auditoria):
   - `etapa_terceirizado = 'finalizado'`
   - `horario_saida_final = now()`
   - `observacoes` = (existente + linha "Saiu sem carregar — <motivo>") com timestamp e usuário
4. Invalidar as queries `movimentacoes_portaria`, `movimentacoes_ativas_patio` e `cargas_fechadas_aguardando` para o card sumir imediatamente.

### Por que finalizar em vez de deletar

- Mantém histórico no relatório de portaria (placa apareceu, foi embora sem carregar).
- Não quebra FK com `carga_id` caso o veículo tivesse carga vinculada.
- Permite filtrar/contar "desistências" no futuro sem migração.
- Para casos de registro duplicado/erro grosseiro, o admin ainda pode apagar pela tela de admin da Portaria.

### Arquivo afetado

- `src/components/expedicao/PainelNoPatio.tsx` — adicionar import de `Button`, `AlertDialog*`, `Textarea`, `useAuth`, `useQueryClient`, `supabase`, `toast`, `useState`; renderizar botão + dialog; mutation inline.

Nenhuma alteração de schema, RLS ou outros componentes.

### Perguntas rápidas antes de implementar

- Texto do botão: prefere **ícone só** (lixeira ou `LogOut`, tooltip "Saiu sem carregar") ou um botão pequeno com label **"Saiu sem carregar"**?
- A observação ("desistiu, problema mecânico, etc.") deve ser **obrigatória** ou **opcional**?