## Diagnóstico

O card "13 adiantamentos" (OC 131166, MOREIRA) do dia 07/07 foi quitado corretamente em 08/07/2026 17:36. Porém o **ADT-20260708-001** (MOREIRA, criado 08/07, saldo R$ 829,00) permaneceu com status **"pago"** — nunca foi marcado como quitado, apesar de provavelmente ter entrado no mesmo pagamento do dia 08/07.

## Ação

Marcar o **ADT-20260708-001** como **quitado em 08/07/2026 17:36** (mesmo horário do lote), via SQL:

```sql
UPDATE adiantamentos_frete
SET status = 'quitado',
    quitado_em = '2026-07-08 17:36:01.347+00'
WHERE numero = 'ADT-20260708-001';
```

Nenhuma alteração de código — apenas correção de dado.
