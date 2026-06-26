## Remover movimentações travadas do Varejo

Identifiquei **11 movimentações** de Varejo (carga_propria) sem saída final que aparecem nos prints (incluindo 1 duplicata do JOAQUIM e 3 registros antigos do JULIO/NWN3975 de maio):

| Placa | Motorista | Chegada | Etapa | carga_id |
|---|---|---|---|---|
| NLL1957 | CESAR AUGUSTO | 24/06 | chegou | 9824000 |
| NKK9877 | EDIVALDO | 24/06 | chegou | 9844000 |
| NKG0770 | ANTONIO GOMES | 24/06 | chegou | 9821000 |
| EFO0D46 | JOAQUIM | 25/06 | chegou | — (×2 duplicado) |
| PR0OD73 | Guilherme | 18/06 | retornou | 9763000 |
| NWN3975 | JULIO | 12/06 | retornou | 9685000 |
| TGB3H26 | RITCHIE | 12/06 | em_rota | 9673000 |
| NWN3975 | JULIO | 29/05 | retornou | 9486000 |
| NWN3975 | JULIO | 20/05 | em_rota | 9332000 |
| NWN3975 | JULIO | 19/05 | retornou | 129633 |
| OMN3I28 | VINICIUS DAMANDO | 14/05 | em_rota | 9214000 |

### Ação
- `DELETE` direto em `movimentacoes_portaria` pelos 11 `id`s acima.
- Sem alteração em código — limpeza pontual de dados.

### Confirmação
Confirma a remoção de **todas as 11** movimentações listadas?
