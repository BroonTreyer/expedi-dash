## Reverter Ayalla para "Aguardando liberação"

A portaria liberou a entrada por engano. Vou reverter o último movimento dele para o estado de chegada (card azul / aguardando liberação no pátio).

### O que será feito

Migração SQL única atualizando o movimento `26993b11-fbc9-49be-8504-f0b1686d9054`:

- `horario_entrada` → `NULL`
- `etapa_terceirizado` → `'chegada'`
- `veiculos_esperados.conferido` → `false` (se houver vínculo com a placa THF1E00 / carga prevista)

Após isso o registro volta a aparecer em "Cargas Fechadas Aguardando" com o botão "Liberar entrada no pátio" e some do Pátio Atual.

### Sem mudanças de código

Nenhum arquivo do front é alterado — é apenas correção de dado operacional.