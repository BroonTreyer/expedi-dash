## Problema

A carga **JR** foi fechada com a placa **RSB1H70** (motorista CELIO ALVES OLIVEIRA), mas o registro em `veiculos_esperados` para `carga_id='JR'` é de outra placa antiga (**QWE1B20 / FAGNO**, walk-in de 27/04). Por isso CELIO não aparece em "Registro de Entrada" nem em "Terceirizado".

### Causa raiz
A função `on_carga_fechada()` faz:
```
SELECT EXISTS(SELECT 1 FROM veiculos_esperados WHERE carga_id = NEW.carga_id)
```
Se já existe **qualquer** linha com aquele `carga_id` (mesmo de outra placa), a trigger pula a criação. Isso quebra quando:
- Uma carga teve placa trocada após fechamento.
- Um walk-in antigo foi vinculado a um `carga_id` que depois é reutilizado.
- A logística reabre/refecha a carga com placa diferente.

A mesma falha existe em `vincular_veiculo_esperado_tardio()`.

## Correções

### 1. Migração SQL — corrigir lógica das triggers
Trocar `EXISTS(... WHERE carga_id = X)` por `EXISTS(... WHERE carga_id = X AND upper(trim(placa)) = upper(trim(NEW.placa)))` em ambas as funções:
- `on_carga_fechada()`
- `vincular_veiculo_esperado_tardio()`

Assim, se o `carga_id` já existe mas com **placa diferente**, um novo `veiculos_esperados` será criado para a placa atual (mantendo o histórico antigo).

### 2. Migração SQL — recuperar o registro do CELIO
INSERT manual na `veiculos_esperados` para a carga JR/RSB1H70/CELIO, com:
- `grupo = 'TERCEIRIZADO'`
- `status_autorizacao = 'previsto'`
- `walk_in = false`
- `conferido = false`
- `data_referencia = CURRENT_DATE`

### 3. Limpar duplicatas em `carregamentos_dia` (opcional, somente investigar)
A carga JR tem 5 linhas iguais (mesma placa, motorista, data) — provavelmente fechamentos repetidos. Isto não é o foco do bug, mas vale verificar se a UI de fechamento está disparando múltiplas vezes. Não vou alterar dados de pedidos sem confirmação.

## Resultado esperado

- CELIO ALVES OLIVEIRA / RSB1H70 passa a aparecer no painel **Cargas Fechadas Aguardando** (em `/portaria/registro-entrada`) e na aba **Terceirizado**.
- Futuras cargas reabertas com nova placa criam corretamente o registro em `veiculos_esperados`.
- Registros antigos de outras placas para o mesmo `carga_id` permanecem intocados (histórico preservado).

## Aprovação
Posso aplicar a migração?
