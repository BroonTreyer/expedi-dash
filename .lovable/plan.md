## Diagnóstico

Verifiquei o registro do JOSE RIDEKS no banco e o session replay do porteiro:

| Hora | Evento |
|------|--------|
| 14:18:47 | Chegada registrada (`horario_chegada` setado, `horario_entrada=null`, `etapa_terceirizado=chegada`) — **card âmbar "Motorista chegou — aguardando autorização" apareceu corretamente** |
| 14:20:25 | Porteiro clicou em "Liberar entrada no pátio" (~1m38s depois) → virou `no_patio` |

**O sistema funcionou tecnicamente certo.** O motorista NÃO pulou a etapa no banco. O que aconteceu na prática é que o porteiro:

1. Registrou a chegada no diálogo (1º passo)
2. O card âmbar apareceu listando o JOSE como "aguardando autorização"
3. Clicou no botão verde "Liberar entrada no pátio" quase imediatamente, sem perceber que era uma 2ª etapa que poderia ficar parada esperando a hora real de o caminhão entrar no pátio

Causa de UX: os dois passos (registrar chegada → liberar entrada) ficam visualmente próximos demais, o botão verde "Liberar entrada no pátio" fica em destaque já no momento em que o card aparece, e nada sinaliza que o caminhão ainda está fisicamente fora.

## O que vamos mudar

Reforçar visualmente e por confirmação que "Liberar entrada no pátio" é o momento em que o caminhão FÍSICO está cruzando o portão — não algo automático para clicar logo após registrar a chegada.

### 1. Toast pós-registro mais explícito
Após registrar a chegada (em `RegistroEntradaDialog`), trocar o toast atual por uma mensagem clara:
> "Chegada registrada. Quando o caminhão entrar fisicamente no pátio, clique em 'Liberar entrada no pátio' no painel abaixo."

### 2. Card âmbar com destaque temporal
Em `CargasFechadasAguardandoPanel`, quando `etapa = chegada` (aguardando liberação):
- Adicionar borda âmbar mais forte e ícone pulsante
- Mostrar um cronômetro grande "Aguardando há Xmin" no card (já existe na lógica, falta destacar)
- Mover o botão "Liberar entrada no pátio" para uma faixa separada com texto acima: **"Confirme apenas quando o caminhão estiver fisicamente no portão entrando no pátio"**

### 3. Confirmação no clique de "Liberar entrada no pátio"
Adicionar `AlertDialog` antes de executar a liberação, perguntando:
> "Confirmar que o caminhão [PLACA] do motorista [NOME] está agora entrando fisicamente no pátio?"

Com botões "Sim, está entrando agora" / "Cancelar". Isso bloqueia o clique reflexivo logo após o registro da chegada.

### 4. Bloquear liberação por 30 segundos após o registro
Como salvaguarda, desabilitar o botão "Liberar entrada no pátio" durante os primeiros 30s após `horario_chegada`, mostrando contagem regressiva. Evita o "clique duplo mental" que aconteceu hoje (1m38s entre os dois cliques é curto demais para o caminhão realmente atravessar o portão).

## Arquivos afetados

- `src/components/portaria/CargasFechadasAguardandoPanel.tsx` — destaque visual do card aguardando, contagem de espera, AlertDialog de confirmação, lockout de 30s
- `src/components/portaria/RegistroEntradaDialog.tsx` — texto do toast pós-registro

Sem alterações de banco e sem mexer no fluxo de dados — apenas UX/guard-rails.

## Detalhe técnico

O lockout de 30s será calculado como `(now - new Date(c.horario_chegada).getTime()) < 30_000`. Se aprovado, posso ajustar esse tempo (ex.: 10s, 60s) conforme você preferir.