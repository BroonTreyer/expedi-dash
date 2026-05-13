## Vincular itens TONI/Moreira a uma carga histórica de 23/04

**Itens afetados** (3 linhas em `carregamentos_dia`):
- `a0b7a936...` — J.M.RIBEIRO — 8.000 kg
- `93ff4833...` — J.M.RIBEIRO — 14.004 kg
- `cbd3a19f...` — COM CONFIANCA — 8.003,6 kg
- Total: **30.007,6 kg**, motorista TONI DA SILVA COSTA, transportadora Moreira

### Ação (UPDATE em `carregamentos_dia`)

Para os 3 IDs acima, definir:
- `data = '2026-04-23'` (volta para o dia em que foram criados)
- `carga_id = 'TONI 23/04'`
- `nome_carga = 'TONI 23/04'`
- `transportadora = 'MOREIRA'` (padroniza maiúsculas)
- `status = 'Carregado'` (já está)
- `updated_at = now()`

### Resultado esperado

- Saem do painel **Expedição de hoje (13/05)** — a carga passa a pertencer ao dia 23/04.
- Aparecem agrupados como uma carga única no **Consolidado** do dia 23/04 (TONI 23/04 — 30.007,6 kg).
- Nenhuma alteração em código, somente dados.

### O que NÃO faço

- Não crio movimento na portaria (não passou pela portaria, então não cabe lançar saída fictícia).
- Não mexo em nenhum outro item.