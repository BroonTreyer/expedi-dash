## Reagrupar ADTs existentes por Ordem de Carga

No desmembramento anterior cada CT-e virou um ADT individual (ADT-...-A, -B, -C...). Agora queremos o nível intermediário: **um ADT por Ordem de Carga (OC)**, contendo todos os CT-es daquela OC.

### Exemplo (print 1)
Hoje (errado — 1 ADT por CT-e):
```
ADT-20260525-004-B  OC 129858  1 CT-e  R$ 74,88
ADT-20260525-004-C  OC 129858  1 CT-e  R$ 4.492,80
ADT-20260525-004-D  OC 129858  1 CT-e  R$ 548,96
ADT-20260525-004-E  OC 129858  1 CT-e  R$ 1.544,40
ADT-20260525-004-F  OC 129858  1 CT-e  R$ 774,76
ADT-20260525-004-A  OC 129858  1 CT-e  R$ 308,88
```
Depois (correto — 1 ADT por OC):
```
ADT-20260525-004-OC129858   OC 129858   6 CT-e   R$ 7.744,68
ADT-20260525-004-OC129849   OC 129849   4 CT-e   R$ 7.034,36
```

### Escopo
Os 3 lotes originais já desmembrados:
- **ADT-20260525-004** (10 CT-es → vira N ADTs, 1 por OC)
- **ADT-20260525-002** (17 CT-es → vira N ADTs, 1 por OC)
- **ADT-20260511-001** (4 CT-es → vira N ADTs, 1 por OC)

### Como vou identificar quem pertencia a cada lote original
Os ADTs atuais têm `numero` no formato `ADT-20260525-004-A`, `-B`, etc. Vou agrupar todos os ADTs que compartilham o mesmo prefixo (`ADT-20260525-004`) **e** mesma `ordem_carga`, fundindo-os em um único ADT.

### Lógica da migração (SQL transacional)
Para cada grupo (prefixo + ordem_carga):
1. Criar **um novo** `adiantamentos_frete` com:
   - `numero` = `<prefixo>-OC<ordem_carga>` (ex: `ADT-20260525-004-OC129858`)
   - `tipo_agrupamento` = `'ordem'`
   - `ordem_carga` = a OC do grupo
   - `qtd_ctes` = soma das qtds
   - `peso_total`, `valor_total_ctes`, `valor_adiantamento`, `valor_saldo` = somas
   - `percentual` = recalculado (`valor_adiantamento / valor_total_ctes * 100`)
   - `status`, `pago_em`, `pago_por`, `quitado_em`, `quitado_por`, `comprovante_pagamento_url`, `observacoes`, `created_by`, `created_at` = preservados do primeiro ADT do grupo (todos do mesmo lote tinham o mesmo status)
2. Mover os `adiantamentos_frete_ctes` (UPDATE `adiantamento_id`) para apontarem para o novo ADT.
3. Deletar os ADTs antigos do grupo.

Grupos com apenas 1 CT-e/ADT permanecem como estão (ou são apenas renomeados — me confirme abaixo).

### Resultado esperado
- Cada OC vira **uma única linha** com múltiplos CT-es agrupados.
- Você ainda consegue selecionar/quitar OC por OC, mas não precisa marcar 6 linhas separadas da mesma OC.
- Para futuros adiantamentos, o comportamento já vigente (1 ADT por OC) continua valendo.

### Confirmações necessárias
1. **Status divergente dentro da mesma OC?** Posso assumir que todos os CT-es da mesma OC dentro do mesmo lote original estão no mesmo status (`pago`/`pendente`)? Pelos seus prints sim, mas confirmo antes de rodar.
2. **Grupos de 1 CT-e:** quando uma OC tem só 1 CT-e (ex.: OC 129791 com R$ 616,00 isolada), mantenho o ADT individual atual (sem renomear) ou também renomeio para o padrão `...-OC<num>`? Sugiro **renomear** para ficar consistente.

Sem mudanças de frontend — só SQL.
