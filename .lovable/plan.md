## Problema

Na aba **Esperados** de `/portaria/terceirizado`, ao clicar em **"Registrar Chegada"** o sistema abre o diálogo completo "Cadastro de Terceirizado", que pede foto da placa, placa, motorista, empresa e tipo de caminhão — todos dados que **já são conhecidos** da planilha de veículos esperados (a tela mostra placa, motorista, transportadora etc.).

Para frota própria (`carga_propria`) o fluxo já está correto: ao clicar em "Registrar Chegada" o sistema faz um INSERT direto registrando apenas o horário de chegada e marca o veículo como conferido — sem abrir nenhum diálogo. Para terceirizado, no entanto, o código atual (`src/pages/Portaria.tsx`, função `openRegistroFromVeiculoEsperado`) força a abertura do `RegistroMovimentoDialog`.

## Objetivo

Equiparar o comportamento de **terceirizado** ao de **carga_propria** quando o clique vem da lista de **Esperados**: registrar a chegada diretamente, sem diálogo, usando os dados já conhecidos. As fotos / lacre / nota fiscal continuam sendo coletadas nas etapas seguintes (Liberado / Saída com lacre), que já existem no fluxo.

## Mudanças

### `src/pages/Portaria.tsx` — função `openRegistroFromVeiculoEsperado`

Remover o ramo que abre o `RegistroMovimentoDialog` para terceirizado. Substituir por um INSERT direto análogo ao de `carga_propria`, gravando:

- `tipo_movimento: "entrada"`
- `categoria: "terceirizado"`
- `etapa_terceirizado: "chegada"`
- `data_hora` e `horario_chegada` = agora
- `placa`, `motorista`, `empresa` (= transportadora), `tipo_caminhao`, `carga_id`, `rota` (= destino), `peso`, `qtd_entregas` vindos do veículo esperado
- `usuario_id` do usuário logado

Após o INSERT, chamar `marcarConferidoMutation` (mesmo padrão de carga_propria) e exibir `toast.success("Chegada de {placa} registrada!")`.

Manter o aviso `toast.warning(...)` quando `data_referencia > dateFromStr` (saída prevista para data futura).

Em caso de erro, mostrar `toast.error("Erro ao registrar chegada")`.

### Resultado para o usuário

- Clique em **"Registrar Chegada"** em um terceirizado esperado → registro imediato, sem formulário; o veículo aparece em **Pátio** e em **PainelChegou** (Expedição) na mesma hora, marcado como conferido.
- Foto da placa, lacre, nota fiscal etc. continuam sendo coletados nas etapas posteriores ("Liberado para sair" / "Saída com lacre"), preservando a trilha de evidências.
- Caso o porteiro precise registrar um terceirizado que **não está** na lista de esperados (walk-in), o botão **"Registrar Movimento"** no topo continua abrindo o diálogo completo normalmente — esse fluxo não é alterado.

## Fora do escopo

- Não alterar o diálogo `RegistroMovimentoDialog` em si.
- Não alterar o fluxo de carga própria (já está correto).
- Não mexer nas etapas posteriores de terceirizado (liberação, saída com lacre, evidências).
