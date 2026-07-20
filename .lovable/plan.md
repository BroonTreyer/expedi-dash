Atualizar `quitado_em` do adiantamento **ADT-20260518-001** (GRANCARGO, OC 129406) para **17/07/2026** via SQL, mantendo o horário atual do registro.

```sql
UPDATE adiantamentos_frete
SET quitado_em = '2026-07-17T12:00:00-03:00'
WHERE numero = 'ADT-20260518-001';
```