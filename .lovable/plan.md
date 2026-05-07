## Voltar Fagno ao card vermelho (Cargas fechadas aguardando veículo)

Vou rodar uma migration que faz 3 coisas, sem mexer em código:

### 1. Refecha a carga JR MIX (31 pedidos da JR DISTRIBUIDORA — pedido #9 de 07/05)
```sql
UPDATE carregamentos_dia
SET etapa='logistica',
    carga_id='CARGA-20260507-JRMIX',
    nome_carga='JR MIX',
    placa='QWE1B20',
    motorista='FAGNO PEREIRA ALMEIDA',
    transportadora='JR TRANSPORTES',
    tipo_caminhao='Carreta',
    horario_inicio=now()
WHERE data='2026-05-07' AND etapa='vendas'
  AND codigo_cliente='10219' AND numero_pedido=9;
```

### 2. Recria o veículo esperado autorizado
```sql
INSERT INTO veiculos_esperados
  (data_referencia, grupo, placa, motorista, transportadora, tipo_veiculo,
   carga_id, status_autorizacao, walk_in, autorizado_em)
VALUES
  ('2026-05-07','TERCEIRIZADO','QWE1B20','FAGNO PEREIRA ALMEIDA','JR TRANSPORTES',
   'Carreta','CARGA-20260507-JRMIX','autorizado',false,now());
```

### 3. Recria a chegada na portaria às 14:06 (sem entrada → card vermelho)
```sql
INSERT INTO movimentacoes_portaria
  (tipo_movimento, categoria, placa, motorista, empresa, tipo_caminhao,
   carga_id, etapa_terceirizado, horario_chegada, data_hora)
VALUES
  ('entrada','terceirizado','QWE1B20','FAGNO PEREIRA ALMEIDA','JR TRANSPORTES','Carreta',
   'CARGA-20260507-JRMIX','chegada',
   '2026-05-07 14:06:06+00','2026-05-07 14:06:06+00');
```

### Resultado
- Os 31 pedidos voltam para a aba Logística.
- A carga **JR MIX** reaparece no painel "Cargas fechadas aguardando veículo" — Fagno volta no **card vermelho** (chegou mas não entrou).
- A portaria pode liberar a entrada normalmente daí.

**Aprova?**