## Correção do nome da Guava

O cadastro em Transportadoras Financeiro já está correto: **GUAVA LOGISTICA E TRANSPORTES LTDA**. O problema é que em cargas antigas e em 1 veículo esperado o nome foi salvo abreviado como **GUAVA LOGISTICA**.

### O que será feito

Rodar 2 UPDATEs no banco:

1. **`carregamentos_dia`** — 32 linhas com `transportadora = 'GUAVA LOGISTICA'` → passam a `'GUAVA LOGISTICA E TRANSPORTES LTDA'`.
2. **`veiculos_esperados`** — 1 linha com `transportadora = 'GUAVA LOGISTICA'` → mesma correção.

Sem mudanças de código, sem migrations, sem mexer em cadastro nem em regras.

### Fora do escopo

- Não altero o cadastro (já está certo).
- Não mexo em outras transportadoras.
- Não crio regra automática de normalização — se quiser depois padronizar novos lançamentos pelo cadastro, é uma tarefa à parte.
