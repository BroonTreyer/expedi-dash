# Alinhar "No pátio" entre Consolidado e Portaria

## O problema (confirmado no banco)

No Consolidado de 20/08 aparecem 3 veículos "No pátio" (ONC6549, RBS5C81, RWY0G15), mas o Pátio de Distribuidores mostra apenas 2 (RBS5C81, RWY0G15).

O veículo a mais é **ONC6549**:

- Existe um registro de portaria de **15/08** ainda em `no_patio`, vinculado à carga `CG-20260814-174307-0LI` (a carga que aparece na linha de 20/08 do Consolidado).
- Esse mesmo veículo teve um ciclo completo depois, em **18/08**, que foi finalizado com saída. Ou seja, o registro de 15/08 é um resíduo — ninguém registrou a saída dele.
- A aba Pátio já descarta esse resíduo (ela ignora entradas antigas quando existe um ciclo posterior finalizado da mesma placa). O badge do Consolidado **não** aplica essa regra: como nenhum movimento da carga cai na janela de 20/08, ele volta atrás e usa todos os movimentos, ressuscitando o de 15/08 como "No pátio".

## Correção

**1. Limpar o dado residual**
Fechar o movimento de 15/08 do ONC6549 (marcar como finalizado, com saída no momento em que o ciclo seguinte começou em 18/08), para que ele deixe de contar como veículo no pátio.

**2. Evitar que volte a acontecer**
Aplicar no badge do Consolidado a mesma regra que o Pátio já usa: um movimento de entrada fica obsoleto quando existe, para a mesma placa, um movimento posterior já finalizado. Movimentos obsoletos não podem definir a etapa da carga — nem no caminho normal, nem no fallback usado quando a janela de datas não encontra nada.

Resultado: os dois painéis passam a contar os mesmos veículos no pátio.

## Detalhes técnicos

- `src/hooks/useStatusPortariaPorCarga.ts`
  - A consulta passa a trazer também os movimentos das placas envolvidas (não só os que têm o `carga_id`), para saber se existe ciclo posterior finalizado.
  - Nova função `ehObsoleto(mov)`: entrada não finalizada cujo timestamp é anterior ao movimento finalizado mais recente da mesma placa.
  - Filtrar obsoletos **antes** de `applyJanela`, para que o fallback (`dentro.length === 0 → rows`) não os reintroduza.
- Dados: `UPDATE movimentacoes_portaria` no registro `6fc6e49d-...` (ONC6549, 15/08) definindo `etapa_terceirizado = 'finalizado'` e `horario_saida_final`.
- Sem mudança de schema; nenhuma outra tela é alterada.
