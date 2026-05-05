
## Tarifa por UF (cidade opcional)

Hoje toda linha da tabela exige `destino_cidade` + `destino_uf`. A proposta torna a cidade opcional: se ficar em branco, a linha vale como **tarifa padrão da UF** e cobre qualquer cidade daquele estado que não tenha linha específica.

### Regra de resolução (precedência)

Para cada `(cliente, cidade, UF, veículo)` o sistema escolhe **a linha mais específica** dentre as tabelas vinculadas ao vendedor:

```
1. cliente + cidade + UF        (mais específico)
2. cliente + UF (sem cidade)
3. cidade + UF (sem cliente)
4. UF (sem cliente, sem cidade) (coringa)
```

A detecção de **conflito** continua igual: se duas tabelas vinculadas ao mesmo vendedor produzirem valores diferentes **no mesmo nível de precedência**, marca `conflito: true` e zera o previsto, mostrando os valores divergentes na linha expandida. Uma linha mais específica em outra tabela sempre vence uma menos específica — isso não é conflito.

### Mudanças

**Banco** (`tabelas_frete_itens`)
- Tornar `destino_cidade` **NULLABLE** (hoje é NOT NULL).
- Manter `destino_uf` obrigatório.
- Sem migração de dados (linhas atuais continuam com cidade preenchida).

**UI — Tabela de Frete** (`TabelaFreteTab.tsx`)
- Campo "Destino" (cidade) passa a ser opcional, com placeholder "(todas as cidades da UF)".
- Linhas sem cidade aparecem com badge "UF inteira" para ficar visualmente claro.
- Validação: se cidade vazia, exigir UF; permitir salvar.
- Busca por destino também encontra as linhas "UF inteira".

**Hook** (`useTabelasFrete.ts`)
- `useUpsertItem`: deixar de fazer `.trim()` obrigatório em cidade — salvar `null` quando vazio.
- Ordenação da listagem: linhas "UF inteira" no topo do grupo de cada UF.

**Resolução de tarifas** (`useGastosVendedor.ts`)
- Reescrever o lookup para tentar as 4 chaves em ordem de precedência e parar na primeira que casar.
- Conflito só é avaliado entre linhas do mesmo nível.

### Detalhes técnicos

- Migração: `ALTER TABLE tabelas_frete_itens ALTER COLUMN destino_cidade DROP NOT NULL;`
- Normalização: `codigo_cliente`/`destino_cidade` armazenados como `null` quando vazio (já é o padrão para `codigo_cliente`).
- Sem alteração em RLS, índices ou hooks de auditoria.
- A migração da tabela "Padrão" criada anteriormente continua válida — você pode optar por reduzir cidades a uma única linha "UF inteira" depois, manualmente.

### Pós-aprovação

Implemento migração + ajustes de UI + nova lógica de resolução em uma única passada.
