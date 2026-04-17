
## Diagnóstico

User aponta dois problemas no card da aba Pátio (`/portaria/terceirizado`):

1. **Confusão semântica do botão "Liberar Entrada"** no card que já tem horários de Chegada (09:57) e Entrada (10:41). Esse card é uma **movimentação de entrada já criada** (`movimentacoes_portaria` tipo=entrada) — ou seja, o veículo **já está no pátio**. O botão "Liberar Entrada" não deveria existir aqui — deveria ser **"Registrar Saída"** (com lacre, fotos, etc.).

2. **Inversão do fluxo de autorização**: hoje a Logística autoriza a entrada (vincula carga) e a Portaria executa um clique apenas para confirmar. O correto operacionalmente é: **Logística vincula a carga** (apenas aloca/prepara), e **Portaria decide quando o veículo entra de fato no pátio** (clica e cria movimento de entrada). O fluxo atual já faz isso, mas o **rótulo e local do botão estão errados**.

Olhando os componentes:
- `PatioAtualTab.tsx` lista movimentações já no pátio (`tipo_movimento='entrada'` ainda não finalizadas). O botão de ação ali deve ser **"Saída"** (já é, no fluxo desktop). No mobile/print enviado parece estar mostrando "Liberar Entrada" — isso é bug de cópia ou o item exibido **não é** uma movimentação, é um `veiculo_esperado` autorizado renderizado dentro do mesmo bloco.

Hipótese mais provável (verificar lendo o arquivo): a aba Pátio está renderizando dois conjuntos misturados — `movimentacoes_portaria` (no pátio de fato) + `veiculos_esperados` autorizados (ainda não no pátio). O card do print é do segundo grupo, mas a coluna "Info" já mostra "Chegada/Entrada" porque o componente reusa o mesmo template e está confundindo `created_at` (registro em Reg. Entrada) com chegada física.

## Plano

Preciso primeiro inspecionar `PatioAtualTab.tsx` e o painel `VeiculosEsperadosPanel.tsx` (ou onde quer que esse card esteja) para confirmar a fonte do dado. Mas com base no fluxo aprovado anteriormente, a correção é:

### 1. Remover "Liberar Entrada" da aba Pátio
- A aba Pátio mostra **somente** `movimentacoes_portaria` com entrada efetiva. O botão de ação dessas linhas deve ser **"Registrar Saída"** (abre `RegistroMovimentoDialog` com lacre/fotos).
- Cards de walk-ins autorizados aguardando porteiro **não** aparecem aqui — eles ficam exclusivamente em `/portaria/registro-entrada` (painel `SolicitacoesPendentesPanel`, grupo "Liberados — aguardando liberação de entrada").

### 2. Esclarecer a coluna "Info"
- Na aba Pátio, "Chegada" = `horario_chegada` (do veículo esperado, momento que porteiro registrou entrada inicial) e "Entrada" = `horario_entrada` (momento que Logística vinculou + porteiro liberou). Ambos já existem no movimento criado. Manter.

### 3. Inverter narrativa (Logística vincula → Portaria libera entrada física)
Já está correto no banco (porteiro clica em "Liberar Entrada" no `SolicitacoesPendentesPanel` e isso cria a movimentação). Apenas garantir que:
- No painel da **Logística** (`FechamentoLoteDialog`), ao vincular carga walk-in, mensagem fica **"Carga vinculada — aguardando Portaria liberar entrada física"** (não "Entrada autorizada").
- No `SolicitacoesPendentesPanel` o subtítulo do grupo "Liberados" fica **"Carga vinculada — clique para liberar entrada no pátio"**.

## Próximos passos antes de implementar
Ler:
- `src/components/portaria/PatioAtualTab.tsx` (verificar de onde vem o card do print)
- `src/components/dashboard/FechamentoLoteDialog.tsx` (mensagem de vinculação walk-in)
- Confirmar se o card do print é de `movimentacoes_portaria` ou de `veiculos_esperados` autorizado.

## Arquivos prováveis
- ✏️ `src/components/portaria/PatioAtualTab.tsx` — remover qualquer botão "Liberar Entrada" daqui, garantir só "Registrar Saída".
- ✏️ `src/components/portaria/SolicitacoesPendentesPanel.tsx` — ajustar copy do grupo "Liberados".
- ✏️ `src/components/dashboard/FechamentoLoteDialog.tsx` — mensagem de toast/UI ao vincular walk-in.

## Sem mudanças em
- Schema, RLS, triggers, fluxo de saída de terceirizado (lacre/fotos), Registro de Entrada page wrapper.
