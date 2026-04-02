
# Corrigir por que “os pesos não voltaram”

## O que eu confirmei
Há 2 problemas diferentes misturados:

1. **A restauração dos pesos manuais não foi consolidada para todos os registros que hoje aparecem na tela**
   - Existem vários pedidos do dia com peso alto correto no banco, mas com `peso_manual = false`.
   - Isso faz o sistema tratar esses pesos como automáticos quando o pedido é aberto para edição.

2. **A lógica atual do dialog ainda permite perder o peso ao editar**
   - Em `CarregamentoDialog.tsx`, a função `inferPesoManual(...)` retorna o valor persistido **sempre que ele existe**.
   - Como `peso_manual` agora sempre existe no banco e muitos registros antigos estão `false`, a inferência nunca roda.
   - Resultado: pedidos com peso diferente do padrão da caixa continuam abrindo como se fossem automáticos e podem ser sobrescritos ao salvar.

## Evidência encontrada
- Na janela exibida no painel, há **247 registros** carregados.
- Desses, **16** ainda aparecem diferentes do peso de criação no histórico.
- **13 desses 16 são Pão de Alho (810–814)**:
  - o histórico de criação mostra 40/80/160
  - mas isso era o valor antigo errado
  - o valor atual menor é o correto
  - então **esses não devem ser restaurados pelo audit**
- Também encontrei pedidos do dia com peso alto correto no banco, mas ainda com `peso_manual = false`, o que explica o bug ao editar.

## Plano de correção

### 1. Corrigir a lógica do dialog para proteger pesos legados
Arquivo: `src/components/dashboard/CarregamentoDialog.tsx`

Vou ajustar a inferência assim:
- `peso_manual = true` continua sendo respeitado
- mas `peso_manual = false` **não vai mais bloquear a inferência**
- se o peso salvo divergir do cálculo `peso_padrao × quantidade`, o item abrirá como manual

Em termos práticos:
```text
Se peso_manual já for true -> manual
Se peso_manual for false, mas o peso salvo for diferente do peso esperado -> tratar como manual
```

Isso impede que um pedido com peso correto no banco seja rebaixado para o peso da caixa ao editar.

### 2. Corrigir os dados que ficaram “certos no peso, errados na flag”
Operação de dados no banco

Vou marcar `peso_manual = true` nos registros em que:
- o peso atual bate com o peso de criação no audit
- e o peso atual diverge do peso padrão do produto

Isso cobre os pedidos do dia que hoje aparecem com peso correto na tabela, mas ainda ficam vulneráveis quando alguém edita.

### 3. Restaurar apenas os registros realmente errados
Operação de dados no banco

Vou separar os casos:
- **Restaurar** registros cujo peso atual foi reduzido indevidamente para o padrão da caixa
- **Não restaurar** os Pães de Alho 810–814, porque o peso de criação deles estava errado desde a origem

Também vou corrigir o registro isolado que hoje parece inflado de forma incorreta em relação ao histórico.

### 4. Manter Pão de Alho protegido
Na correção de dados, vou excluir explicitamente os códigos:
- `810`
- `811`
- `812`
- `813`
- `814`

Assim o sistema não volta a trazer 40/80/160 kg antigos para itens que hoje já estão corretos em 0,4 kg por unidade.

## Arquivos/partes envolvidos
- `src/components/dashboard/CarregamentoDialog.tsx`
- atualização de dados em `carregamentos_dia` com base em `audit_log` e `produtos`

## Validação que vou considerar obrigatória
1. Abrir um pedido do dia com peso alto/manual
2. Confirmar que o campo abre com o peso atual correto
3. Salvar sem mexer no peso
4. Reabrir e validar que ele permaneceu igual
5. Conferir a tabela principal
6. Conferir Rupturas
7. Confirmar que Pão de Alho continua com peso corrigido e não volta ao valor antigo

## Resultado esperado
- os pesos corretos voltam a aparecer e permanecem estáveis
- editar o pedido não derruba mais o valor para o peso da caixa
- os registros antigos de Pão de Alho não são “restaurados errado”
- tabela principal, rupturas e edição passam a ficar consistentes
