## Resultado da verificação

Consultei o `audit_log` e o estado atual da tabela `carregamentos_dia`. **Nenhum pedido foi desfeito, revertido ou voltou sozinho.** O que você está vendo no painel principal é correto.

### Por que parece ter "mais coisa" do que de manhã

O **Painel Principal (Home)** é, por design, uma união de:

1. **Pedidos do dia de hoje (19/06)** — 67 itens (a carga restaurada do André, `CG-20260617-103335-RBZ`, todos `Carregado`).
2. **Carry-over dos últimos 30 dias** — todo pedido com data anterior que ainda **não está `Carregado`** continua aparecendo no painel até ser finalizado. Hoje isso soma 186 itens distribuídos em:

```
18/06 — 32 vendas/Aguardando + 2 logística/Carregando
17/06 — 33 vendas/Aguardando
16/06 — 3  vendas/Pronto para carregar
15/06 — 15 vendas/Pendente/Problema
12/06 — 71 pre_carga/Pronto para carregar
11/06 — 1  vendas/Pronto para carregar
09/06 — 28 logística/Carregando
02/06 — 2  logística (Aguardando + Pronto)
```

Esses 186 itens **já estavam lá antes** — não foram criados, reabertos nem movidos hoje. A regra do carry-over de 30 dias está em `useCarregamentos.ts:140-144`.

### Auditoria das últimas 24h (somente alterações de etapa/carga_id)

- **18/06 13:13** — `logistica@frico.ind.br` fechou a carga `CG-20260618-101344-U5X` (movimentação normal de pré-carga → logística).
- **18/06** (várias horas) — criações e alterações normais do dia anterior.
- **19/06 11:00** — remoção dos 67 itens da carga do André (o problema que já discutimos).
- **19/06 12:26** — restauração dos 67 itens à carga do André (feita por mim, conforme combinado).

**Nenhuma outra carga foi reaberta, nenhum pedido foi excluído e nenhuma reversão ocorreu hoje.**

### Conclusão

O painel está consistente com o banco. A sensação de "mais pedidos do que de manhã" vem do **carry-over de pedidos pendentes de dias anteriores** (especialmente os 71 da pré-carga de 12/06 e os 28 da logística de 09/06), que sempre aparecem enquanto não forem marcados como `Carregado`.

### Nenhuma alteração de código necessária

Esta é uma verificação de dados, não uma correção. Se quiser, posso em seguida:

- Listar pedido a pedido os itens "antigos" (até quando ficar em aberto faz sentido?), ou
- Reduzir a janela de carry-over (hoje são 30 dias) para esconder pendências muito antigas, ou
- Adicionar um indicador visual no card distinguindo "pedidos de hoje" vs "carry-over de dias anteriores".
