## Objetivo

Recriar via banco as 2 cargas que tinham sido canceladas/nunca fechadas, já marcando-as como **expedidas/carregadas** (sem precisar passar pelo fluxo manual de portaria).

## Cargas a criar

**Carga 1 — DICKSON J BATISTA** (pedidos 97 e 99, data 02/05/2026, JORGE BATISTA PI/MA)
- carga_id: novo (gerado)
- nome_carga: `DICKSON J BATISTA`
- placa: `OZR0D10` · motorista: `LUCAS BORGES DA SILVA` · transportadora: `MOREIRA ALVORADA` · tipo: `Carreta`
- 7 linhas do pedido 97 + 8 linhas do pedido 99 = 15 itens

**Carga 2 — CF DISTRIBUIDORA** (pedido 1, data 04/05/2026, CF DISTRIBUIDORA / CEARA FRANGOS)
- carga_id: novo (gerado)
- nome_carga: `CF DISTRIBUIDORA`
- placa: `JBM8E58` · motorista: `TONI DA SILVA COSTA` · transportadora: `Moreira` · tipo: `Carreta`
- todas as linhas do pedido 1 onde data=2026-05-04 e codigo_cliente=21405

## SQL (UPDATE em `carregamentos_dia` para cada grupo)

Para cada carga:
```sql
UPDATE carregamentos_dia
SET carga_id = '<novo_id>',
    nome_carga = '<nome>',
    placa = '<placa>',
    motorista = '<motorista>',
    transportadora = '<transp>',
    tipo_caminhao = 'Carreta',
    etapa = 'logistica',
    status = 'Carregado',
    horario_inicio = now(),
    horario_fim = now()
WHERE id IN (...);
```

Mais um `INSERT` em `audit_log` (action='fechada' + 'carregada') para registrar a operação manual.

## Pontos importantes

- Não vou tocar em outros pedidos com cliente parecido (CEARA ALIMENTOS, SUPERSAFRA etc.) — apenas os IDs específicos identificados.
- `etapa='logistica'` + `status='Carregado'` faz a carga aparecer como expedida no Consolidado/Expedição.
- Não vou criar movimentação de portaria (entrada/saída) — só a carga em si fica como carregada. Se quiser que crie também o registro de entrada+saída na portaria, me avise.

Após aprovação, executo as 2 atualizações e confirmo.