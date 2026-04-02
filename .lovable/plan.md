

# Restaurar os pesos originais dos pedidos

## O que aconteceu
A migration que rodou às 18:03 de hoje recalculou o peso de registros com `quantidade = 1` usando `peso_padrao × quantidade`, tratando os valores altos como "erros". Na realidade, os usuários estavam digitando o peso total desejado (ex: 13.000 kg de linguiça toscana para um cliente), e a migration sobrescreveu esses valores pelo peso de uma única caixa (ex: 20 kg).

## Dados disponíveis para restauração
O audit_log tem os registros de **criação** (`action = 'criado'`) com o campo `changes->'novo'->'peso'` contendo o peso original que o usuário digitou. Confirmei isso consultando o banco — os valores originais estão preservados no log.

## Plano

### 1. Restaurar pesos via audit_log (usando insert tool para UPDATE)
Executar um UPDATE que cruza `carregamentos_dia` com `audit_log` para restaurar o peso original:

```sql
UPDATE carregamentos_dia c
SET peso = (a.changes->'novo'->>'peso')::numeric,
    peso_manual = true
FROM audit_log a
WHERE a.entity_id = c.id::text
  AND a.entity_type = 'carregamento'
  AND a.action = 'criado'
  AND c.quantidade = 1
  AND (a.changes->'novo'->>'peso')::numeric > c.peso * 2
```

Isso pega apenas os registros onde o peso original era significativamente maior que o peso atual (ou seja, os que foram "corrigidos" pela migration errada), e restaura o valor que o usuário digitou originalmente.

Também marca `peso_manual = true` para que o sistema nunca mais sobrescreva esses valores.

### 2. Nenhuma mudança de código necessária
O código atual já respeita `peso_manual = true` e não recalcula o peso nesses casos. A correção é puramente de dados.

## Resultado esperado
- Todos os pedidos que tiveram o peso sobrescrito pela migration voltam ao valor original digitado pelo usuário
- O flag `peso_manual` impede que o sistema sobrescreva novamente no futuro

