## Problema

O Eliseu (QTU3E84) sumiu da tela porque o `PainelChegou` tem um filtro extra que esconde qualquer chegada com mais de **6 horas** sem `horario_entrada` (constante `MAX_AGUARDANDO_MINUTOS = 6 * 60` em `src/components/expedicao/PainelChegou.tsx`).

Como o Eliseu chegou ontem às 16:54 e agora são 11:18 do dia seguinte (~18h depois), ele cai fora desse limite e o painel mostra "Ninguém aguardando entrada", mesmo o registro existindo no banco e estando em aberto.

Esse filtro foi pensado para esconder registros órfãos esquecidos pela portaria, mas agora está mascarando casos reais de motorista que pernoitou aguardando liberação.

## Correção

**Arquivo:** `src/components/expedicao/PainelChegou.tsx`

1. **Remover o filtro de 6 horas** (`MAX_AGUARDANDO_MINUTOS`). A janela de movimentações já está corretamente limitada em `Expedicao.tsx` (D-2 a D, somente em aberto), então não há mais risco de sujeira antiga aparecer.
2. **Manter o badge de tempo aguardando** — quando passar de algumas horas, exibir em tom mais forte (ex.: vermelho a partir de 6h) para sinalizar visualmente o caso anômalo, mas sem esconder o card.
3. O botão "Descartar chegada" continua disponível para o caso de registros realmente órfãos.

## Resultado esperado

- Eliseu volta a aparecer em "Chegou — aguardando liberação" com badge "16:54 · 18h 24min" destacado em vermelho.
- KPIs voltam a contar 1 em "Chegou — aguardando..." e 1 em "A carregar" (já estava ok).
- Marcelo continua exibido normalmente.